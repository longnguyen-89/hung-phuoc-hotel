import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  guest_id_number: z.string().optional().nullable(),
  adults: z.number().int().min(1).optional(),
  children: z.number().int().min(0).optional(),
  deposit_amount: z.number().int().min(0).optional(),
  deposit_method: z.enum(["cash", "bank", "card", "momo", "zalopay", "vnpay", "other"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: booking, error: getErr } = await sb
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });
  if (!booking) return NextResponse.json({ error: "Không tìm thấy booking" }, { status: 404 });
  if (booking.status === "checked_in") {
    return NextResponse.json({ error: "Khách đã check-in rồi" }, { status: 409 });
  }
  if (booking.status === "checked_out" || booking.status === "cancelled") {
    return NextResponse.json(
      { error: "Booking đã đóng, không thể check-in" },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: "checked_in",
    actual_checkin_at: now,
  };
  if (parsed.data.guest_id_number !== undefined) update.guest_id_number = parsed.data.guest_id_number;
  if (parsed.data.adults !== undefined) update.adults = parsed.data.adults;
  if (parsed.data.children !== undefined) update.children = parsed.data.children;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

  const { error: updErr } = await sb.from("bookings").update(update).eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Set room occupied
  await sb.from("rooms").update({ status: "occupied" }).eq("id", booking.room_id);

  // Record deposit payment if any
  if (parsed.data.deposit_amount && parsed.data.deposit_amount > 0) {
    await sb.from("payments").insert({
      booking_id: id,
      amount: parsed.data.deposit_amount,
      method: parsed.data.deposit_method ?? "cash",
      type: "deposit",
      note: "Tiền cọc lúc check-in",
    });
    await sb
      .from("bookings")
      .update({ deposit_amount: parsed.data.deposit_amount })
      .eq("id", id);
  }

  const { data: refreshed } = await sb.from("bookings").select("*").eq("id", id).single();
  return NextResponse.json(refreshed);
}
