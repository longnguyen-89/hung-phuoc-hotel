import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

const patchSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  price_per_day: z.number().int().min(0).optional(),
  price_per_hour: z.number().int().min(0).optional(),
  price_overnight: z.number().int().min(0).optional(),
  capacity: z.number().int().min(0).max(20).optional(),
  max_capacity: z.number().int().min(0).max(20).optional(),
  description: z.string().nullable().optional(),
  amenities: z.array(z.string()).optional(),
  business_status: z.enum(["active", "inactive", "selling_service"]).optional(),
  sort_order: z.number().int().optional(),
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
    .from("room_types")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Mã hạng phòng đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("room_type_id", id);
  if (count && count > 0) {
    return NextResponse.json(
      { error: `Không thể xoá: còn ${count} phòng đang gán hạng này` },
      { status: 409 }
    );
  }
  const { error } = await sb.from("room_types").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
