import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { computeWage } from "@/lib/business/compute-wage";
import { requireOwner } from "@/lib/auth";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  const { id } = await ctx.params;
  const sb = supabaseAdmin();

  const { data: task, error: tErr } = await sb
    .from("cleaning_tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (tErr || !task) {
    return NextResponse.json({ error: "Task không tồn tại" }, { status: 404 });
  }
  if (!task.assigned_to) {
    return NextResponse.json({ error: "Task chưa assign ai" }, { status: 400 });
  }
  if (!task.started_at || !task.completed_at) {
    return NextResponse.json(
      { error: "Task chưa hoàn thành" },
      { status: 400 }
    );
  }

  const { data: staff, error: sErr } = await sb
    .from("staff_profiles")
    .select("*")
    .eq("user_id", task.assigned_to)
    .single();
  if (sErr || !staff) {
    return NextResponse.json({ error: "Cleaner không có profile lương" }, { status: 400 });
  }

  const wage = computeWage({
    task,
    hourlyRate: Number(staff.hourly_rate),
    weekendMultiplier: Number(staff.weekend_multiplier),
    holidayMultiplier: Number(staff.holiday_multiplier),
  });

  await sb.from("wage_entries").upsert(
    {
      task_id: task.id,
      cleaner_id: task.assigned_to,
      base_hours: wage.baseHours,
      base_rate: wage.baseRate,
      base_amount: wage.baseAmount,
      bonus_amount: wage.bonusAmount,
      bonus_reason: wage.bonusReason || null,
      penalty_amount: wage.penaltyAmount,
      penalty_reason: wage.penaltyReason || null,
      total_amount: wage.totalAmount,
    },
    { onConflict: "task_id" }
  );

  await sb
    .from("cleaning_tasks")
    .update({
      status: "approved",
      reviewed_by: owner.appUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  await sb.from("rooms").update({ status: "available" }).eq("id", task.room_id);

  return NextResponse.json({ ok: true, wage });
}
