import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

export async function GET(req: Request) {
  const owner = await requireOwner();
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("bookings")
    .select(
      "code, guest_name, guest_phone, guest_email, booking_type, adults, children, checkin_at, checkout_at, actual_checkin_at, actual_checkout_at, nights, hours, unit_price, room_charge, discount_amount, service_charge, vat_amount, total_amount, paid_amount, balance_due, source, status, rooms!inner(name, room_number, property_id)"
    )
    .eq("rooms.property_id", owner.propertyId)
    .gte("checkin_at", from + "T00:00:00")
    .lte("checkin_at", to + "T23:59:59")
    .order("checkin_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = [
    "Mã",
    "Phòng",
    "Khách",
    "SĐT",
    "Email",
    "Loại",
    "Người lớn",
    "Trẻ em",
    "Check-in",
    "Check-out",
    "Check-in thực",
    "Check-out thực",
    "Số đêm",
    "Số giờ",
    "Đơn giá",
    "Tiền phòng",
    "Giảm giá",
    "Phí DV",
    "VAT",
    "Tổng",
    "Đã thu",
    "Còn lại",
    "Nguồn",
    "Trạng thái",
  ];
  const rows = (data ?? []).map((b: any) => [
    b.code,
    b.rooms?.name,
    b.guest_name,
    b.guest_phone,
    b.guest_email,
    b.booking_type,
    b.adults,
    b.children,
    b.checkin_at,
    b.checkout_at,
    b.actual_checkin_at,
    b.actual_checkout_at,
    b.nights,
    b.hours,
    b.unit_price,
    b.room_charge,
    b.discount_amount,
    b.service_charge,
    b.vat_amount,
    b.total_amount,
    b.paid_amount,
    b.balance_due,
    b.source,
    b.status,
  ]);

  const csv = toCsv([header, ...rows]);
  const filename = `bookings_${from}_${to}.csv`;
  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function toCsv(rows: unknown[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          if (c == null) return "";
          const s = String(c);
          if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(",")
    )
    .join("\n");
}
