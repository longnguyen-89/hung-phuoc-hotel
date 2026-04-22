import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { computeBookingPrice } from "@/lib/business/compute-booking-price";

export async function GET() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("bookings")
    .select("*, rooms!inner(name, room_number, floor, property_id)")
    .eq("rooms.property_id", owner.propertyId)
    .order("checkin_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const createSchema = z.object({
  room_id: z.string().uuid(),
  guest_name: z.string().min(1),
  guest_phone: z.string().optional().nullable(),
  guest_email: z.string().email().optional().nullable().or(z.literal("")),
  guest_id_number: z.string().optional().nullable(),
  checkin_at: z.string(),
  checkout_at: z.string(),
  booking_type: z.enum(["daily", "hourly"]).default("daily"),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  unit_price: z.number().int().min(0).optional(),
  discount_amount: z.number().int().min(0).default(0),
  source: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const owner = await requireOwner();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { checkin_at, checkout_at, room_id, booking_type } = parsed.data;
  if (new Date(checkout_at) <= new Date(checkin_at)) {
    return NextResponse.json(
      { error: "checkout_at phải sau checkin_at" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();

  // Overlap check
  const { data: conflicts } = await sb
    .from("bookings")
    .select("id, guest_name, checkin_at, checkout_at")
    .eq("room_id", room_id)
    .neq("status", "cancelled")
    .neq("status", "checked_out")
    .lt("checkin_at", checkout_at)
    .gt("checkout_at", checkin_at);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { error: "Trùng lịch với booking khác", conflicts },
      { status: 409 }
    );
  }

  // Lấy giá hiệu lực của phòng (override > type)
  const { data: room } = await sb
    .from("rooms")
    .select(
      "id, price_per_day, price_per_hour, price_overnight, room_types(price_per_day, price_per_hour, price_overnight)"
    )
    .eq("id", room_id)
    .maybeSingle();

  if (!room) return NextResponse.json({ error: "Không tìm thấy phòng" }, { status: 404 });

  const typeObj = (room.room_types ?? null) as unknown as
    | { price_per_day: number; price_per_hour: number; price_overnight: number }
    | null;
  const effectiveDay = room.price_per_day ?? typeObj?.price_per_day ?? 0;
  const effectiveHour = room.price_per_hour ?? typeObj?.price_per_hour ?? 0;

  const unitPrice =
    parsed.data.unit_price != null
      ? parsed.data.unit_price
      : booking_type === "daily"
      ? effectiveDay
      : effectiveHour;

  // Lấy VAT từ system_settings
  const { data: settings } = await sb
    .from("system_settings")
    .select("vat_enabled, vat_rate, service_charge_enabled, service_charge_rate")
    .eq("property_id", owner.propertyId)
    .maybeSingle();

  const vatRate = settings?.vat_enabled ? Number(settings.vat_rate) : 0;
  const scRate = settings?.service_charge_enabled ? Number(settings.service_charge_rate) : 0;

  const price = computeBookingPrice({
    booking_type,
    checkin_at,
    checkout_at,
    unit_price: unitPrice,
    discount_amount: parsed.data.discount_amount,
    vat_rate: vatRate,
    service_charge_rate: scRate,
  });

  // Initial status
  const now = new Date();
  let status: "upcoming" | "checked_in" | "checked_out" = "upcoming";
  if (new Date(checkout_at) < now) status = "checked_out";
  else if (new Date(checkin_at) < now) status = "checked_in";

  const { data, error } = await sb
    .from("bookings")
    .insert({
      room_id,
      guest_name: parsed.data.guest_name,
      guest_phone: parsed.data.guest_phone,
      guest_email: parsed.data.guest_email || null,
      guest_id_number: parsed.data.guest_id_number,
      checkin_at,
      checkout_at,
      booking_type,
      adults: parsed.data.adults,
      children: parsed.data.children,
      unit_price: unitPrice,
      nights: price.nights,
      hours: price.hours,
      room_charge: price.room_charge,
      discount_amount: price.discount_amount,
      service_charge: price.service_charge,
      vat_rate: vatRate,
      vat_amount: price.vat_amount,
      total_amount: price.total_amount,
      source: parsed.data.source ?? "direct",
      notes: parsed.data.notes ?? null,
      status,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
