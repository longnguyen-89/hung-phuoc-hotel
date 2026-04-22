import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CLEANER_COOKIE } from "@/lib/cleaner-session";

export async function POST() {
  const jar = await cookies();
  jar.delete(CLEANER_COOKIE);
  return NextResponse.json({ ok: true });
}
