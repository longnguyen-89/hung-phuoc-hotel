import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getCleanerSession } from "@/lib/cleaner-session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getCleanerSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const taskId = String(form.get("task_id") ?? "");
  const category = String(form.get("category") ?? "room");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  }
  if (!taskId) {
    return NextResponse.json({ error: "Thiếu task_id" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File phải là ảnh" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Ảnh tối đa 5MB" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${taskId}/${category}-${Date.now()}.${ext}`;

  const { error } = await sb.storage
    .from("task-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = sb.storage.from("task-photos").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, category });
}
