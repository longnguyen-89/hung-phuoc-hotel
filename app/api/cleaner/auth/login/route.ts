import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CLEANER_COOKIE } from "@/lib/cleaner-session";

const Body = z.object({ phone: z.string().min(8) });

// MVP: không dùng OTP thật, chỉ cần SĐT tồn tại trong app_users với role=cleaner.
// Phase production sẽ thay bằng OTP SMS.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu số điện thoại" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("app_users")
    .select("id, full_name, role, is_active")
    .eq("phone", parsed.data.phone.trim())
    .maybeSingle();

  if (!user || user.role !== "cleaner" || !user.is_active) {
    return NextResponse.json(
      { error: "Số điện thoại chưa được đăng ký làm cleaner" },
      { status: 404 }
    );
  }

  const jar = await cookies();
  jar.set(CLEANER_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true, name: user.full_name });
}
