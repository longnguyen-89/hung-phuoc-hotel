import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import {
  PriorityBadge,
  TaskStatusBadge,
} from "@/components/shared/status-badge";
import { fmtDateTime, fmtDuration } from "@/lib/utils/format";
import Link from "next/link";
import { AssignBar } from "./_components/assign-bar";

export const dynamic = "force-dynamic";

export default async function TasksPage(props: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const statusFilter = searchParams?.status;

  const owner = await requireOwner();
  const sb = supabaseAdmin();
  let q = sb
    .from("cleaning_tasks")
    .select(
      "*, rooms!inner(name, property_id), assignee:app_users!cleaning_tasks_assigned_to_fkey(id, full_name)"
    )
    .eq("rooms.property_id", owner.propertyId)
    .order("due_before");
  if (statusFilter) q = q.eq("status", statusFilter);

  const { data: tasks } = await q;
  const { data: cleaners } = await sb
    .from("staff_profiles")
    .select("user_id, app_users!inner(id, full_name)")
    .eq("property_id", owner.propertyId);

  const cleanerList = (cleaners ?? []).map((c) => ({
    id: c.user_id,
    // @ts-expect-error
    name: c.app_users.full_name,
  }));

  const tabs: { key: string | undefined; label: string }[] = [
    { key: undefined, label: "Tất cả" },
    { key: "pending", label: "Chờ gán" },
    { key: "assigned", label: "Đã gán" },
    { key: "in_progress", label: "Đang dọn" },
    { key: "pending_review", label: "Chờ duyệt" },
    { key: "approved", label: "Đã duyệt" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Task dọn phòng</h1>
        <p className="text-slate-500 text-sm">Quản lý toàn bộ task dọn dẹp</p>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => {
          const active = t.key === statusFilter;
          return (
            <Link
              key={t.label}
              href={t.key ? `/tasks?status=${t.key}` : "/tasks"}
              className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                active
                  ? "border-brand-600 text-brand-700 font-medium"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Phòng</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Ưu tiên</th>
              <th className="p-3">Deadline</th>
              <th className="p-3">Thời gian dọn</th>
              <th className="p-3">Người dọn</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(tasks ?? []).map((t) => {
              const duration =
                t.started_at && t.completed_at
                  ? Math.round(
                      (new Date(t.completed_at).getTime() -
                        new Date(t.started_at).getTime()) /
                        60000
                    )
                  : null;
              return (
                <tr key={t.id} className="border-t">
                  <td className="p-3 font-medium">
                    {(t.rooms as any).name}
                  </td>
                  <td className="p-3">
                    <TaskStatusBadge status={t.status} />
                  </td>
                  <td className="p-3">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="p-3 text-slate-600">
                    {fmtDateTime(t.due_before)}
                  </td>
                  <td className="p-3 text-slate-600">
                    {fmtDuration(duration)}
                  </td>
                  <td className="p-3">
                    {t.assignee ? (
                      <span>{(t.assignee as any).full_name}</span>
                    ) : (
                      <AssignBar taskId={t.id} cleaners={cleanerList} />
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/tasks/${t.id}`}
                      className="text-brand-600 hover:underline text-xs"
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(tasks ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Không có task.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
