import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getCleanerSession } from "@/lib/cleaner-session";

const PhotoSchema = z.object({ url: z.string().url(), category: z.string() });
const Body = z.object({
  checklist: z.record(z.string(), z.boolean()),
  photos: z.array(PhotoSchema).min(1, "Cần ít nhất 1 ảnh"),
  dirty_level: z.enum(["light", "normal", "heavy"]).optional(),
  note: z.string().optional().nullable(),
});

const REQUIRED_CHECKS = ["bed", "toilet", "trash", "amenity"] as const;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCleanerSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const missing = REQUIRED_CHECKS.filter((k) => !parsed.data.checklist[k]);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Chưa hoàn tất: ${missing.join(", ")}` }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: task } = await sb
    .from("cleaning_tasks")
    .select("id, assigned_to, status, started_at")
    .eq("id", id)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "Không tìm thấy task" }, { status: 404 });
  if (task.assigned_to !== session.user.id) {
    return NextResponse.json({ error: "Task này không phải của bạn" }, { status: 403 });
  }
  if (task.status !== "in_progress") {
    return NextResponse.json({ error: "Bạn cần check-in trước khi hoàn tất" }, { status: 400 });
  }

  const { error } = await sb
    .from("cleaning_tasks")
    .update({
      status: "pending_review",
      completed_at: new Date().toISOString(),
      checklist_json: parsed.data.checklist,
      photos_json: parsed.data.photos,
      dirty_level: parsed.data.dirty_level ?? "normal",
      cleaner_note: parsed.data.note ?? null,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
