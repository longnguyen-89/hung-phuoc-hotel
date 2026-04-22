import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// DEV-only: mô phỏng cleaner hoàn thành task để test flow approve
// (Phase 3 sẽ thay thế bằng UI Cleaner PWA thật)
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = supabaseAdmin();

  const { data: task } = await sb
    .from("cleaning_tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const started = new Date(now.getTime() - 50 * 60_000); // 50 phút trước

  const { error } = await sb
    .from("cleaning_tasks")
    .update({
      started_at: started.toISOString(),
      completed_at: now.toISOString(),
      status: "pending_review",
      checklist_json: { bed: true, toilet: true, trash: true, amenity: true },
      dirty_level: "normal",
      photos_json: [
        { url: "https://picsum.photos/seed/bed/400/300", category: "bedroom" },
        { url: "https://picsum.photos/seed/toilet/400/300", category: "bathroom" },
        { url: "https://picsum.photos/seed/floor/400/300", category: "floor" },
      ],
      qr_scanned_at: started.toISOString(),
      gps_valid: true,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
