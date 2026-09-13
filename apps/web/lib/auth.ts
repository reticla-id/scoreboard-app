import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function getUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return error || typeof data?.claims?.sub !== "string" ? null : data.claims.sub;
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
  const id = await requireUserId();
  const profile = await getProfile(id);
  if (!profile) redirect("/profile/setup");
  return { id, profile };
}

export async function redirectAuthenticatedUser() {
  const id = await getUserId();
  if (id) redirect((await getProfile(id)) ? "/home" : "/profile/setup");
}
