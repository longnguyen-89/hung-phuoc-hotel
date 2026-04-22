import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  room_number: z.string().min(1).max(20).optional(),
  floor: z.number().int().min(0).max(50).nullable().optional(),
  room_type_id: z.string().uuid().nullable().optional(),
  default_clean_minutes: z.number().int().min(10).max(240).optional(),
  price_per_day: z.number().int().min(0).nullable().optional(),
  price_per_hour: z.number().int().min(0).nullable().optional(),
  price_overnight: z.number().int().min(0).nullable().optional(),
  business_status: z.enum(["active", "inactive", "selling_service"]).optional(),
  status: z.enum(["available", "occupied", "cleaning", "dirty", "maintenance"]).optional(),
  note: z.string().nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("rooms")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Số phòng đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = supabaseAdmin();
  const { error } = await sb.from("rooms").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
