import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

export async function GET() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("rooms")
    .select("*, room_types(id, code, name, price_per_day, price_per_hour, price_overnight)")
    .eq("property_id", owner.propertyId)
    .order("floor", { ascending: false })
    .order("room_number");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const createSchema = z.object({
  name: z.string().min(1),
  room_number: z.string().min(1).max(20).optional(),
  floor: z.number().int().min(0).max(50).optional().nullable(),
  room_type_id: z.string().uuid().optional().nullable(),
  default_clean_minutes: z.number().int().min(10).max(240).default(45),
  price_per_day: z.number().int().min(0).optional().nullable(),
  price_per_hour: z.number().int().min(0).optional().nullable(),
  price_overnight: z.number().int().min(0).optional().nullable(),
  business_status: z.enum(["active", "inactive", "selling_service"]).optional(),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const owner = await requireOwner();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("rooms")
    .insert({ ...parsed.data, property_id: owner.propertyId })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Số phòng đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
