import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getCleanerSession } from "@/lib/cleaner-session";
import { validateCheckIn } from "@/lib/business/validate-checkin";

const Body = z.object({
  qr_token: z.string().min(1),
  gps_lat: z.number().nullable(),
  gps_lng: z.number().nullable(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCleanerSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const sb = supabaseAdmin();

  const { data: task } = await sb
    .from("cleaning_tasks")
    .select("id, room_id, assigned_to, status")
    .eq("id", id)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "Không tìm thấy task" }, { status: 404 });
  if (task.assigned_to !== session.user.id) {
    return NextResponse.json({ error: "Task này không phải của bạn" }, { status: 403 });
  }
  if (!["assigned", "pending"].includes(task.status)) {
    return NextResponse.json({ error: `Không thể check-in khi task đang ở trạng thái ${task.status}` }, { status: 400 });
  }

  const { data: room } = await sb
    .from("rooms")
    .select("id, qr_token, property_id")
    .eq("id", task.room_id)
    .maybeSingle();
  if (!room) return NextResponse.json({ error: "Không tìm thấy phòng" }, { status: 404 });

  const { data: property } = await sb
    .from("properties")
    .select("latitude, longitude, geofence_radius_m")
    .eq("id", room.property_id)
    .maybeSingle();
  if (!property) return NextResponse.json({ error: "Không tìm thấy property" }, { status: 404 });

  const gps =
    parsed.data.gps_lat != null && parsed.data.gps_lng != null
      ? { lat: parsed.data.gps_lat, lng: parsed.data.gps_lng }
      : null;

  const result = validateCheckIn({
    qrToken: parsed.data.qr_token,
    roomQrToken: room.qr_token,
    gps,
    property: {
      latitude: property.latitude,
      longitude: property.longitude,
      geofence_radius_m: property.geofence_radius_m,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: uErr } = await sb
    .from("cleaning_tasks")
    .update({
      status: "in_progress",
      started_at: now,
      qr_scanned_at: now,
      gps_lat: parsed.data.gps_lat,
      gps_lng: parsed.data.gps_lng,
      gps_valid: true,
    })
    .eq("id", id);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  await sb.from("rooms").update({ status: "cleaning" }).eq("id", task.room_id);

  return NextResponse.json({ ok: true, distance_m: result.distanceM });
}
