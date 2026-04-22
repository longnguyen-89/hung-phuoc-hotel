import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getCleanerSession } from "@/lib/cleaner-session";
import { ScanClient } from "./scan-client";

export const dynamic = "force-dynamic";

export default async function ScanPage(props: { params: Promise<{ id: string }> }) {
  const session = await getCleanerSession();
  if (!session) redirect("/cleaner/login");
  const { id } = await props.params;

  const sb = supabaseAdmin();
  const { data: task } = await sb
    .from("cleaning_tasks")
    .select("id, status, assigned_to, room_id, rooms(name, qr_token)")
    .eq("id", id)
    .maybeSingle();
  if (!task || task.assigned_to !== session.user.id) notFound();

  if (task.status === "in_progress") redirect(`/cleaner/tasks/${id}/active`);
  if (task.status !== "assigned" && task.status !== "pending") {
    redirect(`/cleaner/tasks/${id}`);
  }

  return (
    <ScanClient
      taskId={id}
      // @ts-expect-error rooms relation
      roomName={task.rooms?.name ?? "Phòng"}
      // @ts-expect-error rooms relation
      roomQrToken={task.rooms?.qr_token ?? ""}
    />
  );
}
