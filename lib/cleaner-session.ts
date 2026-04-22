import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AppUser, StaffProfile } from "@/lib/types";

export const CLEANER_COOKIE = "cleaner_uid";

export type CleanerSession = {
  user: AppUser;
  profile: StaffProfile;
};

export async function getCleanerSession(): Promise<CleanerSession | null> {
  const jar = await cookies();
  const uid = jar.get(CLEANER_COOKIE)?.value;
  if (!uid) return null;

  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("app_users")
    .select("*")
    .eq("id", uid)
    .eq("role", "cleaner")
    .eq("is_active", true)
    .maybeSingle();
  if (!user) return null;

  const { data: profile } = await sb
    .from("staff_profiles")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (!profile) return null;

  return { user: user as AppUser, profile: profile as StaffProfile };
}
