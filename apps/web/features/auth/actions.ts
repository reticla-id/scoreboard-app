"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { admitCurrentAuthSession } from "./devices";
import { db } from "@/lib/db";

export type AuthState = { error?: string; success?: string };

const baseCredentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});
const signUpSchema = baseCredentialsSchema.extend({ password: z.string().min(8).max(128) });

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = baseCredentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Could not sign in. Check your credentials and try again." };
  const admission = await admitCurrentAuthSession(supabase);
  if (admission !== "active") {
    await supabase.auth.signOut({ scope: "local" });
    return { error: admission === "limit" ? "Three devices are already active. Sign out on another device, then try again." : "This session could not be verified. Please try again." };
  }
  redirect("/auth/complete");
}

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password (at least 8 characters)." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${appUrl()}/auth/callback` },
  });
  if (error) return { error: "Could not create an account. Try again or use another email." };
  if (data.session) {
    const admission = await admitCurrentAuthSession(supabase);
    if (admission !== "active") {
      await supabase.auth.signOut({ scope: "local" });
      return { error: admission === "limit" ? "Three devices are already active. Sign out on another device, then try again." : "This session could not be verified. Please try again." };
    }
    redirect("/auth/complete");
  }
  return { success: "Check your email to confirm your account, then sign in." };
}

export async function signOut() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("Could not sign out. Try again.");
  if (typeof data?.claims?.sub === "string" && typeof data.claims.session_id === "string") {
    await db().deviceSession.deleteMany({ where: { userId: data.claims.sub, sessionId: data.claims.session_id } });
  }
  redirect("/sign-in");
}
