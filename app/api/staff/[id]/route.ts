import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

const updateSchema = z
  .object({
    full_name: z.string().min(2).max(100).optional(),
    hourly_rate: z.number().int().min(10000).max(500000).optional(),
    weekend_multiplier: z.number().min(1).max(3).optional(),
    holiday_multiplier: z.number().min(1).max(5).optional(),
    bank_name: z.string().max(50).nullable().optional(),
    bank_account: z.string().max(50).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Không có thay đổi" });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();

  const { data: user } = await sb
    .from("app_users")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();
  if (!user || user.role !== "cleaner") {
    return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
  }

  const userUpdate: Record<string, unknown> = {};
  if (parsed.data.full_name !== undefined) userUpdate.full_name = parsed.data.full_name.trim();
  if (parsed.data.is_active !== undefined) userUpdate.is_active = parsed.data.is_active;
  if (Object.keys(userUpdate).length > 0) {
    const { error } = await sb.from("app_users").update(userUpdate).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profileUpdate: Record<string, unknown> = {};
  for (const k of ["hourly_rate", "weekend_multiplier", "holiday_multiplier", "bank_name", "bank_account"] as const) {
    if (parsed.data[k] !== undefined) profileUpdate[k] = parsed.data[k];
  }
  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await sb.from("staff_profiles").update(profileUpdate).eq("user_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
