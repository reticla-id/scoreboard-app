import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { requireWorkspace } from "@/lib/auth";
import { avatarSource } from "@/features/profile/avatar";
import { SettingsForm } from "@/features/profile/settings-form";
import { SettingsSignOut } from "@/features/profile/settings-sign-out";

export const metadata: Metadata = { title: "Profile & Settings" };

export default async function SettingsPage() {
  const { profile, email } = await requireWorkspace();
  return <main className="site-shell settings-page">
    <BackLink href="/home" previous />
    <header className="settings-head"><p className="eyebrow"><span className="dot" /> YOUR ACCOUNT</p><h1>PROFILE &amp;<br />SETTINGS.</h1></header>
    <SettingsForm displayName={profile.displayName} username={profile.username} email={email ?? "Email unavailable"} avatarSrc={avatarSource(profile.avatarUrl, profile.updatedAt)} />
    <section className="future-settings" aria-labelledby="future-settings-heading"><span className="panel-index">MORE CONTROLS</span><h2 id="future-settings-heading">MORE SETTINGS, SOON.</h2><p>Additional account preferences will appear here as Reticla grows.</p></section>
    <SettingsSignOut />
  </main>;
}
