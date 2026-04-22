import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

export async function GET(req: Request) {
  const owner = await requireOwner();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const sb = supabaseAdmin();
  let q = sb
    .from("cleaning_tasks")
    .select("*, rooms!inner(name, property_id), assignee:app_users!cleaning_tasks_assigned_to_fkey(full_name)")
    .eq("rooms.property_id", owner.propertyId)
    .order("due_before");
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
