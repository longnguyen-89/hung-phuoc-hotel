import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

export async function GET() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("staff_profiles")
    .select("*, app_users!inner(id, full_name, phone, is_active)")
    .eq("property_id", owner.propertyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const createSchema = z.object({
  full_name: z.string().min(2, "Tên tối thiểu 2 ký tự").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{8,10}$/, "SĐT không hợp lệ (VD: 0900000001)"),
  hourly_rate: z.number().int().min(10000).max(500000),
  weekend_multiplier: z.number().min(1).max(3).default(1.2),
  holiday_multiplier: z.number().min(1).max(5).default(1.5),
  bank_name: z.string().max(50).optional().nullable(),
  bank_account: z.string().max(50).optional().nullable(),
});

export async function POST(req: Request) {
  const owner = await requireOwner();
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }
  const sb = supabaseAdmin();

  const { data: existing } = await sb
    .from("app_users")
    .select("id")
    .eq("phone", parsed.data.phone)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "SĐT đã đăng ký" }, { status: 409 });
  }

  const { data: user, error: uErr } = await sb
    .from("app_users")
    .insert({
      full_name: parsed.data.full_name.trim(),
      phone: parsed.data.phone,
      role: "cleaner",
      is_active: true,
    })
    .select()
    .single();
  if (uErr || !user) {
    return NextResponse.json({ error: uErr?.message ?? "Lỗi tạo user" }, { status: 500 });
  }

  const { error: pErr } = await sb.from("staff_profiles").insert({
    user_id: user.id,
    property_id: owner.propertyId,
    hourly_rate: parsed.data.hourly_rate,
    weekend_multiplier: parsed.data.weekend_multiplier,
    holiday_multiplier: parsed.data.holiday_multiplier,
    bank_name: parsed.data.bank_name ?? null,
    bank_account: parsed.data.bank_account ?? null,
  });
  if (pErr) {
    await sb.from("app_users").delete().eq("id", user.id);
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
}
