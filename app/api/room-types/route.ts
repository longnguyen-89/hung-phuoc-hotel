import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

export async function GET() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("room_types")
    .select("*, rooms(count)")
    .eq("property_id", owner.propertyId)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  price_per_day: z.number().int().min(0).default(0),
  price_per_hour: z.number().int().min(0).default(0),
  price_overnight: z.number().int().min(0).default(0),
  capacity: z.number().int().min(0).max(20).default(2),
  max_capacity: z.number().int().min(0).max(20).default(3),
  description: z.string().optional().nullable(),
  amenities: z.array(z.string()).optional(),
  business_status: z.enum(["active", "inactive", "selling_service"]).default("active"),
  sort_order: z.number().int().optional(),
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
    .from("room_types")
    .insert({
      ...parsed.data,
      amenities: parsed.data.amenities ?? [],
      property_id: owner.propertyId,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Mã hạng phòng đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
