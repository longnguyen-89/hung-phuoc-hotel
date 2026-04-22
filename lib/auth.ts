import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export type OwnerContext = {
  userId: string;
  appUserId: string;
  propertyId: string;
  email: string;
  fullName: string;
};

export const getOwnerContext = cache(async (): Promise<OwnerContext | null> => {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const admin = supabaseAdmin();

  let { data: appUser } = await admin
    .from("app_users")
    .select("id, full_name, email, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!appUser) {
    const { data: newAppUser } = await admin
      .from("app_users")
      .insert({
        auth_user_id: user.id,
        email: user.email ?? null,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          user.email ??
          "Owner",
        role: "owner",
      })
      .select("id, full_name, email, role")
      .single();
    if (!newAppUser) return null;
    appUser = newAppUser;

    // Claim the orphan property (owner_id IS NULL) if any.
    await admin
      .from("properties")
      .update({ owner_id: newAppUser.id })
      .is("owner_id", null);
  }

  if (appUser.role !== "owner") return null;

  const { data: property } = await admin
    .from("properties")
    .select("id")
    .eq("owner_id", appUser.id)
    .maybeSingle();

  if (!property) return null;

  return {
    userId: user.id,
    appUserId: appUser.id,
    propertyId: property.id,
    email: appUser.email ?? user.email ?? "",
    fullName: appUser.full_name,
  };
});

export async function requireOwner(): Promise<OwnerContext> {
  const ctx = await getOwnerContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function isSignupAllowed(): Promise<boolean> {
  const admin = supabaseAdmin();
  const { count } = await admin
    .from("properties")
    .select("id", { count: "exact", head: true })
    .is("owner_id", null);
  return (count ?? 0) > 0;
}
