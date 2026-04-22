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
    .from("payments")
    .select(
      "received_at, amount, method, type, note, bookings!inner(code, guest_name, rooms!inner(name, property_id))"
    )
    .eq("bookings.rooms.property_id", owner.propertyId)
    .gte("received_at", from + "T00:00:00")
    .lte("received_at", to + "T23:59:59")
    .order("received_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = ["Thời gian", "Mã booking", "Phòng", "Khách", "Loại", "Phương thức", "Số tiền", "Ghi chú"];
  const rows = (data ?? []).map((p: any) => [
    p.received_at,
    p.bookings?.code,
    p.bookings?.rooms?.name,
    p.bookings?.guest_name,
    p.type,
    p.method,
    p.amount,
    p.note,
  ]);

  const csv = toCsv([header, ...rows]);
  const filename = `payments_${from}_${to}.csv`;
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
