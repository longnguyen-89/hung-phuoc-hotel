import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getCleanerSession } from "@/lib/cleaner-session";
import { fmtVnd, fmtDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const session = await getCleanerSession();
  if (!session) redirect("/cleaner/login");

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const sb = supabaseAdmin();
  const { data: entries } = await sb
    .from("wage_entries")
    .select("*, cleaning_tasks!inner(id, started_at, rooms(name))")
    .eq("cleaner_id", session.user.id)
    .gte("computed_at", start)
    .lt("computed_at", end)
    .order("computed_at", { ascending: false });

  const list = entries ?? [];
  const total = list.reduce((s, e) => s + Number(e.total_amount), 0);
  const totalHours = list.reduce((s, e) => s + Number(e.base_hours), 0);

  const monthLabel = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-sm text-slate-500">Lương tháng {monthLabel}</div>
        <div className="text-3xl font-bold text-brand-600 mt-1">{fmtVnd(total)}</div>
        <div className="text-xs text-slate-500 mt-1">
          {list.length} task · {totalHours.toFixed(1)} giờ · {fmtVnd(Number(session.profile.hourly_rate))}/giờ
        </div>
      </div>

      {list.length === 0 && (
        <div className="card p-6 text-center text-slate-500 text-sm">
          Chưa có task nào được duyệt trong tháng này.
        </div>
      )}

      <div className="space-y-2">
        {list.map((e) => (
          <div key={e.id} className="card p-3 space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900 text-sm">
                {(e.cleaning_tasks as any)?.rooms?.name ?? "Phòng"}
              </div>
              <div className="font-bold text-brand-600">{fmtVnd(Number(e.total_amount))}</div>
            </div>
            <div className="text-xs text-slate-500">
              {fmtDateTime((e.cleaning_tasks as any)?.started_at)} · {Number(e.base_hours).toFixed(2)}h
            </div>
            {(e.bonus_amount > 0 || e.penalty_amount > 0) && (
              <div className="text-xs space-x-2">
                {Number(e.bonus_amount) > 0 && (
                  <span className="text-green-700">+{fmtVnd(Number(e.bonus_amount))}</span>
                )}
                {Number(e.penalty_amount) > 0 && (
                  <span className="text-red-700">-{fmtVnd(Number(e.penalty_amount))}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
