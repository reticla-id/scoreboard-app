import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { ensureDeviceSession } from "@/features/auth/devices";

async function getIdentity() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || typeof data?.claims?.sub !== "string" || typeof data.claims.session_id !== "string") return null;
  if (await ensureDeviceSession(data.claims.sub, data.claims.session_id) !== "active") return null;
  return { id: data.claims.sub, sessionId: data.claims.session_id, email: typeof data.claims.email === "string" ? data.claims.email : null };
}

export async function getUserId() {
  return (await getIdentity())?.id ?? null;
}

export async function requireUserId() {
  const id = await getUserId();
  if (!id) redirect("/sign-in?error=session");
  return id;
}

export async function getProfile(id: string) {
  return db().profile.findUnique({ where: { id } });
}

export async function requireWorkspace() {
  const identity = await getIdentity();
  if (!identity) redirect("/sign-in?error=session");
  const profile = await getProfile(identity.id);
  if (!profile) redirect("/profile/setup");
  return { id: identity.id, sessionId: identity.sessionId, email: identity.email, profile };
}

export async function redirectAuthenticatedUser() {
  const id = await getUserId();
  if (id) redirect((await getProfile(id)) ? "/home" : "/profile/setup");
}
