import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = supabaseAdmin();
  const { data: booking } = await sb.from("bookings").select("status, room_id").eq("id", id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (booking.status === "checked_out" || booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking đã đóng" }, { status: 409 });
  }
  const { error } = await sb.from("bookings").update({ status: "cancelled" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (booking.status === "checked_in") {
    await sb.from("rooms").update({ status: "available" }).eq("id", booking.room_id);
  }
  return NextResponse.json({ ok: true });
}
