"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, type AuthState } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/browser";

function SubmitButton({ mode }: { mode: "in" | "up" }) {
  const { pending } = useFormStatus();
  return <button className="button button-full" disabled={pending} type="submit">{pending ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}<span aria-hidden="true">↗</span></button>;
}

export function AuthForm({ mode }: { mode: "in" | "up" }) {
  const [state, action] = useActionState<AuthState, FormData>(mode === "in" ? signIn : signUp, {});
  const [oauthError, setOauthError] = useState("");
  const [oauthPending, setOauthPending] = useState(false);

  async function signInWithGoogle() {
    setOauthError("");
    setOauthPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setOauthError("Google sign-in could not start. Please try again.");
      setOauthPending(false);
    }
  }

  return <div className="auth-controls">
    <button className="button button-secondary button-full google-button" type="button" onClick={signInWithGoogle} disabled={oauthPending}>{oauthPending ? "Connecting…" : "Continue with Google"}</button>
    <div className="separator"><span>or with email</span></div>
    <form action={action} className="stack form-stack">
      <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={mode === "in" ? 1 : 8} maxLength={128} placeholder={mode === "in" ? "Your password" : "At least 8 characters"} />
      {state.error && <p className="message error" role="alert">{state.error}</p>}
      {state.success && <p className="message success" role="status">{state.success}</p>}
      <SubmitButton mode={mode} />
    </form>
    {oauthError && <p className="message error" role="alert">{oauthError}</p>}
  </div>;
}
