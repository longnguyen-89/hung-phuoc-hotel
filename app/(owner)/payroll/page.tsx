import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { fmtDateTime, fmtVnd } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();

  const { data: staff } = await sb
    .from("staff_profiles")
    .select("user_id, app_users!inner(full_name, phone)")
    .eq("property_id", owner.propertyId);

  const ids = (staff ?? []).map((s) => s.user_id);
  const { data: wages } = await sb
    .from("wage_entries")
    .select("*, cleaning_tasks!inner(room_id, completed_at, rooms!inner(name))")
    .in("cleaner_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    .order("computed_at", { ascending: false });

  const grouped = (staff ?? []).map((s) => {
    const rows = (wages ?? []).filter((w) => w.cleaner_id === s.user_id);
    return {
      cleaner_id: s.user_id,
      // @ts-expect-error
      full_name: s.app_users.full_name,
      // @ts-expect-error
      phone: s.app_users.phone,
      rows,
      total_hours: rows.reduce((x, r) => x + Number(r.base_hours), 0),
      total_amount: rows.reduce((x, r) => x + Number(r.total_amount), 0),
    };
  });

  const grandTotal = grouped.reduce((x, g) => x + g.total_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Bảng lương</h1>
          <p className="text-slate-500 text-sm">
            Tổng hợp các task đã duyệt (chưa đóng kỳ)
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Tổng phải trả</div>
          <div className="text-3xl font-bold text-brand-700">
            {fmtVnd(grandTotal)}
          </div>
        </div>
      </div>

      {grouped.map((g) => (
        <div key={g.cleaner_id} className="card p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="font-semibold">{g.full_name}</div>
              <div className="text-xs text-slate-500">{g.phone}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">
                {g.rows.length} task • {g.total_hours.toFixed(2)}h
              </div>
              <div className="text-lg font-bold">{fmtVnd(g.total_amount)}</div>
            </div>
          </div>

          {g.rows.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có task nào được duyệt.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-left border-b">
                <tr>
                  <th className="py-2">Phòng</th>
                  <th>Thời điểm</th>
                  <th>Giờ công</th>
                  <th>Cơ bản</th>
                  <th>Thưởng</th>
                  <th>Phạt</th>
                  <th className="text-right">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((w) => (
                  <tr key={w.id} className="border-b last:border-0">
                    <td className="py-2">
                      {(w.cleaning_tasks as any).rooms.name}
                    </td>
                    <td className="text-slate-600">
                      {fmtDateTime((w.cleaning_tasks as any).completed_at)}
                    </td>
                    <td>{Number(w.base_hours).toFixed(2)}h</td>
                    <td>{fmtVnd(w.base_amount)}</td>
                    <td className="text-green-600">
                      {Number(w.bonus_amount) > 0 ? `+${fmtVnd(w.bonus_amount)}` : "—"}
                    </td>
                    <td className="text-red-600">
                      {Number(w.penalty_amount) > 0
                        ? `−${fmtVnd(w.penalty_amount)}`
                        : "—"}
                    </td>
                    <td className="text-right font-semibold">
                      {fmtVnd(w.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
