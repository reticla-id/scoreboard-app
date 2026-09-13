"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

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
  if (data.session) redirect("/auth/complete");
  return { success: "Check your email to confirm your account, then sign in." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
