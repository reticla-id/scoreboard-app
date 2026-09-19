"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function signOutOtherDevices(): Promise<{ error?: string }> {
  const { id, sessionId } = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { error: "Could not sign out other devices. Try again." };
  await db().deviceSession.updateMany({ where: { userId: id, sessionId: { not: sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
  revalidatePath("/settings");
  return {};
}

export async function signOutAllDevices(): Promise<{ error?: string }> {
  const { id } = await requireWorkspace();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) return { error: "Could not sign out all devices. Try again." };
  await db().deviceSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  redirect("/sign-in");
}
