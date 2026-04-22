import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { autoAssignCleaner } from "@/lib/business/auto-assign";
import { requireOwner } from "@/lib/auth";

const schema = z.object({
  cleaner_id: z.string().uuid().optional(),
  auto: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sb = supabaseAdmin();

  if (parsed.data.auto || !parsed.data.cleaner_id) {
    const picked = await autoAssignCleaner(id, owner.propertyId);
    if (!picked) {
      return NextResponse.json({ error: "Không có cleaner nào rảnh" }, { status: 404 });
    }
    return NextResponse.json({ cleaner_id: picked, auto: true });
  }

  const { error } = await sb
    .from("cleaning_tasks")
    .update({ assigned_to: parsed.data.cleaner_id, status: "assigned" })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cleaner_id: parsed.data.cleaner_id, auto: false });
}
