import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  final_amount: z.number().int().min(0).optional(), // override total nếu có (VD check-out sớm/thêm dịch vụ)
  payment_amount: z.number().int().min(0).optional(),
  payment_method: z.enum(["cash", "bank", "card", "momo", "zalopay", "vnpay", "other"]).optional(),
  note: z.string().optional().nullable(),
});

// Check-out booking → ghi thanh toán cuối cùng + trigger BR-01 auto-create cleaning task
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
  if (booking.status === "checked_out") {
    return NextResponse.json({ error: "Đã check-out rồi" }, { status: 409 });
  }

  const now = new Date().toISOString();

  // Nếu owner điều chỉnh total (VD: thêm dịch vụ, giảm giá thêm)
  if (parsed.data.final_amount !== undefined) {
    await sb.from("bookings").update({ total_amount: parsed.data.final_amount }).eq("id", id);
  }

  // Ghi payment cho số tiền vừa thu (nếu có)
  if (parsed.data.payment_amount && parsed.data.payment_amount > 0) {
    await sb.from("payments").insert({
      booking_id: id,
      amount: parsed.data.payment_amount,
      method: parsed.data.payment_method ?? "cash",
      type: "balance",
      note: parsed.data.note ?? "Thanh toán khi check-out",
    });
  }

  // Update booking status → trigger BR-01 sinh cleaning task + update rooms.dirty
  const { data: updated, error: updErr } = await sb
    .from("bookings")
    .update({ status: "checked_out", actual_checkout_at: now })
    .eq("id", id)
    .select()
    .single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json(updated);
}
