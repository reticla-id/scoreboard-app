import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/features/auth/auth-form";
import { redirectAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await redirectAuthenticatedUser();
  const { error } = await searchParams;
  return <main className="auth-page auth-page-sign-in"><div className="auth-top"><Brand /><span>YOUR WORKSPACE AWAITS</span></div><section className="auth-panel"><p className="eyebrow"><span className="dot" /> WELCOME BACK</p><h1>SIGN IN.</h1><p className="muted">Pick up where your last match left off.</p>{error === "callback" && <p className="message error" role="alert">Authentication could not be completed. Please try again.</p>}<AuthForm mode="in" /><p className="auth-switch">New to Reticla? <Link href="/sign-up">Create an account</Link></p></section><div className="auth-aside" aria-hidden="true"><span>THE GAME STARTS HERE.</span></div></main>;
}
