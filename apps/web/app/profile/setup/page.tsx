import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { ProfileForm } from "@/features/profile/profile-form";
import { requireUserId, getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Set up profile" };

export default async function ProfileSetup() {
  const id = await requireUserId();
  if (await getProfile(id)) redirect("/home");
  return <main className="setup-page"><header className="site-header"><Brand /><span className="step-label">01 / PROFILE SETUP</span></header><section className="setup-panel"><p className="eyebrow"><span className="dot" /> ONE QUICK STEP</p><h1>MAKE IT<br />YOURS.</h1><p className="muted">Just the basics to set up your personal workspace.</p><ProfileForm /></section></main>;
}
