import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

// Aggregate wage_entries của cleaner thuộc property — grouped by cleaner, chưa paid
export async function GET() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data: staff } = await sb
    .from("staff_profiles")
    .select("user_id, app_users!inner(full_name, phone)")
    .eq("property_id", owner.propertyId);

  if (!staff) return NextResponse.json([]);

  const ids = staff.map((s) => s.user_id);
  const { data: wages } = await sb
    .from("wage_entries")
    .select("*, cleaning_tasks!inner(room_id, rooms!inner(name))")
    .in("cleaner_id", ids);

  const grouped = staff.map((s) => {
    const rows = (wages ?? []).filter((w) => w.cleaner_id === s.user_id);
    const total = rows.reduce((sum, r) => sum + Number(r.total_amount), 0);
    const totalHours = rows.reduce((sum, r) => sum + Number(r.base_hours), 0);
    return {
      cleaner_id: s.user_id,
      // @ts-expect-error supabase join type
      full_name: s.app_users.full_name,
      // @ts-expect-error supabase join type
      phone: s.app_users.phone,
      task_count: rows.length,
      total_hours: totalHours,
      total_amount: total,
      entries: rows,
    };
  });

  return NextResponse.json(grouped);
}
