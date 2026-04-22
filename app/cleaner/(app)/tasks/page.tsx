import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getCleanerSession } from "@/lib/cleaner-session";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/status-badge";
import { fmtDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function CleanerTasksPage() {
  const session = await getCleanerSession();
  if (!session) redirect("/cleaner/login");

  const sb = supabaseAdmin();
  const { data: tasks } = await sb
    .from("cleaning_tasks")
    .select("id, status, priority, due_before, room_id, rooms(name)")
    .eq("assigned_to", session.user.id)
    .in("status", ["assigned", "in_progress", "pending_review"])
    .order("due_before");

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">Task hôm nay</h1>

      {(tasks ?? []).length === 0 && (
        <div className="card p-6 text-center text-slate-500 text-sm">
          Hiện chưa có task nào được gán cho bạn.
        </div>
      )}

      <div className="space-y-3">
        {(tasks ?? []).map((t) => {
          const cta =
            t.status === "assigned"
              ? "Bắt đầu"
              : t.status === "in_progress"
                ? "Tiếp tục"
                : "Xem";
          const href =
            t.status === "assigned"
              ? `/cleaner/tasks/${t.id}/scan`
              : t.status === "in_progress"
                ? `/cleaner/tasks/${t.id}/active`
                : `/cleaner/tasks/${t.id}`;
          return (
            <Link
              key={t.id}
              href={href}
              className="card p-4 flex items-center justify-between hover:border-brand-300"
            >
              <div className="space-y-1">
                <div className="font-medium text-slate-900">
                  {/* @ts-expect-error rooms relation */}
                  {t.rooms?.name ?? "Phòng"}
                </div>
                <div className="flex gap-2">
                  <TaskStatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                </div>
                <div className="text-xs text-slate-500">
                  Deadline: {fmtDateTime(t.due_before)}
                </div>
              </div>
              <span className="btn bg-brand-600 text-white hover:bg-brand-700 h-9 px-4 text-sm">
                {cta}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
