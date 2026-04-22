import { supabaseAdmin } from "@/lib/supabase/server";
import {
  PriorityBadge,
  TaskStatusBadge,
} from "@/components/shared/status-badge";
import { fmtDateTime, fmtDuration, fmtVnd } from "@/lib/utils/format";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ApproveRejectBar } from "./_components/approve-reject-bar";
import { SimulateCompleteButton } from "./_components/simulate-complete";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const sb = supabaseAdmin();

  const { data: task } = await sb
    .from("cleaning_tasks")
    .select(
      "*, rooms(name), assignee:app_users!cleaning_tasks_assigned_to_fkey(full_name, phone)"
    )
    .eq("id", id)
    .single();
  if (!task) notFound();

  const { data: wage } = await sb
    .from("wage_entries")
    .select("*")
    .eq("task_id", id)
    .maybeSingle();

  const duration =
    task.started_at && task.completed_at
      ? Math.round(
          (new Date(task.completed_at).getTime() -
            new Date(task.started_at).getTime()) /
            60000
        )
      : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">
            Task: {(task.rooms as any).name}
          </h1>
          <div className="flex gap-2 mt-2">
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        {task.status === "assigned" || task.status === "pending" ? (
          <SimulateCompleteButton taskId={task.id} />
        ) : task.status === "pending_review" ? (
          <ApproveRejectBar taskId={task.id} />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard title="Thông tin task">
          <InfoRow label="Loại" value={task.type} />
          <InfoRow label="Deadline" value={fmtDateTime(task.due_before)} />
          <InfoRow
            label="Người dọn"
            value={
              task.assignee ? (task.assignee as any).full_name : "(chưa gán)"
            }
          />
          <InfoRow label="Bắt đầu" value={fmtDateTime(task.started_at)} />
          <InfoRow label="Kết thúc" value={fmtDateTime(task.completed_at)} />
          <InfoRow label="Thời gian dọn" value={fmtDuration(duration)} />
          <InfoRow
            label="Mức bẩn"
            value={task.dirty_level ?? "—"}
          />
        </InfoCard>

        <InfoCard title="Check-in check">
          <InfoRow label="QR scan" value={fmtDateTime(task.qr_scanned_at)} />
          <InfoRow
            label="GPS"
            value={
              task.gps_lat && task.gps_lng
                ? `${task.gps_lat}, ${task.gps_lng}`
                : "—"
            }
          />
          <InfoRow
            label="GPS hợp lệ"
            value={
              task.gps_valid === null
                ? "—"
                : task.gps_valid
                ? "✅ Trong geofence"
                : "❌ Ngoài geofence"
            }
          />
          {task.cleaner_note && (
            <InfoRow label="Ghi chú cleaner" value={task.cleaner_note} />
          )}
          {task.rejection_reason && (
            <InfoRow
              label="Lý do từ chối"
              value={task.rejection_reason}
            />
          )}
        </InfoCard>
      </div>

      {task.photos_json && (task.photos_json as { url: string; category: string }[]).length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Ảnh nghiệm thu</h2>
          <div className="grid grid-cols-3 gap-3">
            {(task.photos_json as { url: string; category: string }[]).map((p, i) => (
              <div key={i} className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.category}
                  className="w-full aspect-[4/3] object-cover rounded-md border"
                />
                <div className="text-xs text-slate-500 capitalize">{p.category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {task.checklist_json && Object.keys(task.checklist_json as object).length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Checklist</h2>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(task.checklist_json as Record<string, boolean>).map(
              ([k, v]) => (
                <div
                  key={k}
                  className={`p-2 rounded border text-sm ${
                    v ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  }`}
                >
                  {v ? "✅" : "❌"} {k}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {wage && (
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Tính lương</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              <tr>
                <td className="py-2 text-slate-500">Giờ công</td>
                <td className="text-right">{Number(wage.base_hours).toFixed(2)}h</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-500">Đơn giá</td>
                <td className="text-right">{fmtVnd(wage.base_rate)}/giờ</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-500">Tiền cơ bản</td>
                <td className="text-right">{fmtVnd(wage.base_amount)}</td>
              </tr>
              {Number(wage.bonus_amount) > 0 && (
                <tr>
                  <td className="py-2 text-slate-500">
                    Thưởng
                    {wage.bonus_reason && (
                      <span className="text-xs block">{wage.bonus_reason}</span>
                    )}
                  </td>
                  <td className="text-right text-green-600">
                    + {fmtVnd(wage.bonus_amount)}
                  </td>
                </tr>
              )}
              {Number(wage.penalty_amount) > 0 && (
                <tr>
                  <td className="py-2 text-slate-500">
                    Phạt
                    {wage.penalty_reason && (
                      <span className="text-xs block">{wage.penalty_reason}</span>
                    )}
                  </td>
                  <td className="text-right text-red-600">
                    − {fmtVnd(wage.penalty_amount)}
                  </td>
                </tr>
              )}
              <tr className="font-bold">
                <td className="py-2">Tổng</td>
                <td className="text-right text-lg">{fmtVnd(wage.total_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
