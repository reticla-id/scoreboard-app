import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/features/auth/auth-form";
import { redirectAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUp() {
  await redirectAuthenticatedUser();
  return <main className="auth-page"><div className="auth-top"><Brand /><span>CREATE YOUR WORKSPACE</span></div><section className="auth-panel"><p className="eyebrow"><span className="dot" /> GET IN THE GAME</p><h1>JOIN RETICLA.</h1><p className="muted">Create an account and get ready to host.</p><AuthForm mode="up" /><p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p></section><div className="auth-aside" aria-hidden="true"><span>BUILT FOR THE HOST.</span></div></main>;
}
