import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getCleanerSession } from "@/lib/cleaner-session";
import { TaskStatusBadge, PriorityBadge } from "@/components/shared/status-badge";
import { fmtDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function CleanerTaskDetail(props: { params: Promise<{ id: string }> }) {
  const session = await getCleanerSession();
  if (!session) redirect("/cleaner/login");
  const { id } = await props.params;

  const sb = supabaseAdmin();
  const { data: task } = await sb
    .from("cleaning_tasks")
    .select("*, rooms(name)")
    .eq("id", id)
    .maybeSingle();

  if (!task || task.assigned_to !== session.user.id) notFound();

  const nextHref =
    task.status === "assigned"
      ? `/cleaner/tasks/${id}/scan`
      : task.status === "in_progress"
        ? `/cleaner/tasks/${id}/active`
        : null;

  return (
    <div className="p-4 space-y-4">
      <Link href="/cleaner/tasks" className="text-sm text-slate-500">← Danh sách</Link>

      <div className="card p-4 space-y-3">
        <div className="text-xl font-bold text-slate-900">
          {(task.rooms as any)?.name ?? "Phòng"}
        </div>
        <div className="flex gap-2">
          <TaskStatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="text-sm text-slate-600 space-y-1">
          <div>Deadline: <span className="font-medium">{fmtDateTime(task.due_before)}</span></div>
          {task.started_at && <div>Bắt đầu: {fmtDateTime(task.started_at)}</div>}
          {task.completed_at && <div>Hoàn tất: {fmtDateTime(task.completed_at)}</div>}
        </div>
      </div>

      {task.status === "pending_review" && (
        <div className="card p-4 bg-purple-50 border-purple-200 text-sm text-purple-800">
          Đang chờ chủ nhà duyệt. Khi duyệt xong, lương sẽ được cộng vào bảng lương tháng.
        </div>
      )}

      {task.status === "approved" && (
        <div className="card p-4 bg-green-50 border-green-200 text-sm text-green-800">
          Task đã được duyệt. Xem lương ở tab "Lương".
        </div>
      )}

      {task.status === "rejected" && (
        <div className="card p-4 bg-red-50 border-red-200 text-sm text-red-800 space-y-1">
          <div className="font-medium">Chủ nhà đã từ chối</div>
          {task.rejection_reason && <div>Lý do: {task.rejection_reason}</div>}
        </div>
      )}

      {nextHref && (
        <Link
          href={nextHref}
          className="btn bg-brand-600 text-white hover:bg-brand-700 h-11 px-4 w-full text-base"
        >
          {task.status === "assigned" ? "Bắt đầu dọn" : "Tiếp tục dọn"}
        </Link>
      )}

      {Array.isArray(task.photos_json) && task.photos_json.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-700">Ảnh đã nộp</div>
          <div className="grid grid-cols-3 gap-2">
            {task.photos_json.map((p: { url: string; category: string }, i: number) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p.url} alt={p.category} className="rounded border aspect-square object-cover" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
