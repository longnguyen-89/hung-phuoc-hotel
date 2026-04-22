import { supabaseAdmin } from "../supabase/server";

/**
 * BR-02: Auto-assign cleaner theo round-robin
 * Chọn cleaner của property có ít phút công nhất hôm nay.
 */
export async function autoAssignCleaner(taskId: string, propertyId: string) {
  const sb = supabaseAdmin();

  const { data: candidates } = await sb
    .from("staff_profiles")
    .select("user_id, app_users!inner(id, full_name, is_active, role)")
    .eq("property_id", propertyId)
    .eq("app_users.is_active", true)
    .eq("app_users.role", "cleaner");

  if (!candidates || candidates.length === 0) return null;

  // Đếm phút công hôm nay của mỗi cleaner
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayTasks } = await sb
    .from("cleaning_tasks")
    .select("assigned_to, started_at, completed_at")
    .gte("started_at", today.toISOString());

  const minutesByUser = new Map<string, number>();
  for (const t of todayTasks ?? []) {
    if (!t.assigned_to || !t.started_at || !t.completed_at) continue;
    const mins = (new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 60000;
    minutesByUser.set(t.assigned_to, (minutesByUser.get(t.assigned_to) ?? 0) + mins);
  }

  // Sắp xếp theo workload tăng dần
  const sorted = [...candidates].sort((a, b) => {
    const ma = minutesByUser.get(a.user_id) ?? 0;
    const mb = minutesByUser.get(b.user_id) ?? 0;
    return ma - mb;
  });

  const picked = sorted[0];

  await sb
    .from("cleaning_tasks")
    .update({ assigned_to: picked.user_id, status: "assigned" })
    .eq("id", taskId);

  return picked.user_id;
}
