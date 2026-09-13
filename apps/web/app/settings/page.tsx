import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { requireWorkspace } from "@/lib/auth";
import { avatarSource } from "@/features/profile/avatar";
import { SettingsForm } from "@/features/profile/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await requireWorkspace();
  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href="/home" />
    <header className="settings-head"><p className="eyebrow"><span className="dot" /> YOUR ACCOUNT</p><h1>SETTINGS.</h1><p className="muted">The essentials for your courtside identity.</p></header>
    <SettingsForm displayName={profile.displayName} username={profile.username} avatarSrc={avatarSource(profile.avatarUrl, profile.updatedAt)} />
    <footer className="site-footer"><span>RETICLA / PERSONAL WORKSPACE</span><span>@{profile.username}</span></footer>
  </main>;
}
