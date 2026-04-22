import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

export async function GET() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("invoices")
    .select(
      "*, bookings!inner(code, guest_name, rooms!inner(name, property_id))"
    )
    .eq("bookings.rooms.property_id", owner.propertyId)
    .order("issued_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const schema = z.object({
  booking_id: z.string().uuid(),
});

export async function POST(req: Request) {
  const owner = await requireOwner();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: b, error: bErr } = await sb
    .from("bookings")
    .select(
      "*, rooms(name, room_types(name))"
    )
    .eq("id", parsed.data.booking_id)
    .maybeSingle();
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
  if (!b) return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });

  const { data: settings } = await sb
    .from("system_settings")
    .select("invoice_prefix")
    .eq("property_id", owner.propertyId)
    .maybeSingle();
  const prefix = settings?.invoice_prefix || "HD";

  // Idempotent: reuse existing invoice for this booking if any
  const { data: existing } = await sb
    .from("invoices")
    .select("*")
    .eq("booking_id", parsed.data.booking_id)
    .maybeSingle();
  if (existing) return NextResponse.json(existing);

  // Build invoice number
  const year = new Date().getFullYear();
  const { count } = await sb
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .gte("issued_at", `${year}-01-01`);
  const seq = (count ?? 0) + 1;
  const invoiceNumber = `${prefix}${year}${seq.toString().padStart(5, "0")}`;

  const lines = [
    {
      name: `Tiền phòng ${b.rooms?.name} (${b.booking_type === "hourly" ? "theo giờ" : "theo ngày"})`,
      qty: b.booking_type === "hourly" ? Number(b.hours) : Number(b.nights),
      unit_price: Number(b.unit_price),
      amount: Number(b.room_charge),
    },
  ];
  if (b.discount_amount && b.discount_amount > 0) {
    lines.push({
      name: "Giảm giá",
      qty: 1,
      unit_price: -Number(b.discount_amount),
      amount: -Number(b.discount_amount),
    });
  }
  if (b.service_charge && b.service_charge > 0) {
    lines.push({
      name: "Phí dịch vụ",
      qty: 1,
      unit_price: Number(b.service_charge),
      amount: Number(b.service_charge),
    });
  }

  const { data, error } = await sb
    .from("invoices")
    .insert({
      booking_id: parsed.data.booking_id,
      invoice_number: invoiceNumber,
      subtotal: Number(b.room_charge) - Number(b.discount_amount ?? 0),
      service_charge: Number(b.service_charge ?? 0),
      discount_amount: Number(b.discount_amount ?? 0),
      vat_rate: Number(b.vat_rate ?? 0),
      vat_amount: Number(b.vat_amount ?? 0),
      total_amount: Number(b.total_amount),
      lines_json: lines,
      customer_json: {
        name: b.guest_name,
        phone: b.guest_phone,
        email: b.guest_email,
        id_number: b.guest_id_number,
      },
      issued_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
