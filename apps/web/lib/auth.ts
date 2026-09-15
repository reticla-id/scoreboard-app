import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function getIdentity() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || typeof data?.claims?.sub !== "string") return null;
  return { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
}

export async function getUserId() {
  return (await getIdentity())?.id ?? null;
}

export async function requireUserId() {
  const id = await getUserId();
  if (!id) redirect("/sign-in");
  return id;
}

export async function getProfile(id: string) {
  return db().profile.findUnique({ where: { id } });
}

export async function requireWorkspace() {
  const identity = await getIdentity();
  if (!identity) redirect("/sign-in");
  const profile = await getProfile(identity.id);
  if (!profile) redirect("/profile/setup");
  return { id: identity.id, email: identity.email, profile };
}

export async function redirectAuthenticatedUser() {
  const id = await getUserId();
  if (id) redirect((await getProfile(id)) ? "/home" : "/profile/setup");
}
