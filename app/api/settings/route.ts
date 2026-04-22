import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

export async function GET() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("system_settings")
    .select("*")
    .eq("property_id", owner.propertyId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const schema = z.object({
  hotel_name: z.string().min(1),
  hotel_address: z.string().optional().nullable(),
  hotel_phone: z.string().optional().nullable(),
  hotel_email: z.string().optional().nullable(),
  tax_code: z.string().optional().nullable(),
  vat_enabled: z.boolean(),
  vat_rate: z.number().min(0).max(100),
  service_charge_enabled: z.boolean(),
  service_charge_rate: z.number().min(0).max(100),
  default_checkin_time: z.string().optional().nullable(),
  default_checkout_time: z.string().optional().nullable(),
  overnight_hour_start: z.number().int().min(0).max(23).optional().nullable(),
  overnight_hour_end: z.number().int().min(0).max(23).optional().nullable(),
  currency: z.string().optional().nullable(),
  invoice_prefix: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  extra_fees_json: z.array(z.object({
    name: z.string(),
    type: z.enum(["fixed", "percent"]),
    amount: z.number(),
  })).optional().nullable(),
});

export async function PATCH(req: Request) {
  const owner = await requireOwner();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const sb = supabaseAdmin();

  const { data: existing } = await sb
    .from("system_settings")
    .select("id")
    .eq("property_id", owner.propertyId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await sb
      .from("system_settings")
      .update(parsed.data)
      .eq("property_id", owner.propertyId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await sb
    .from("system_settings")
    .insert({ ...parsed.data, property_id: owner.propertyId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
