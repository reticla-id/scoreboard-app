import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { requireWorkspace } from "@/lib/auth";
import { avatarSource } from "@/features/profile/avatar";
import { SettingsForm } from "@/features/profile/settings-form";
import { SettingsSignOut } from "@/features/profile/settings-sign-out";
import { listDeviceSessions } from "@/features/auth/devices";
import { DevicesPanel } from "@/features/auth/devices-panel";

export const metadata: Metadata = { title: "Profile & Settings" };

export default async function SettingsPage() {
  const { id, sessionId, profile, email } = await requireWorkspace();
  const devices = (await listDeviceSessions(id)).map((device) => ({
    sessionId: device.sessionId,
    deviceName: device.deviceName,
    deviceType: device.deviceType,
    current: device.sessionId === sessionId,
    lastActive: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(device.lastSeenAt) + " UTC",
  }));
  return <main className="site-shell settings-page">
    <BackLink href="/home" previous />
    <header className="settings-head"><p className="eyebrow"><span className="dot" /> YOUR ACCOUNT</p><h1>PROFILE &amp;<br />SETTINGS.</h1></header>
    <SettingsForm displayName={profile.displayName} username={profile.username} email={email ?? "Email unavailable"} avatarSrc={avatarSource(profile.avatarUrl, profile.updatedAt)} />
    <DevicesPanel devices={devices} />
    <SettingsSignOut />
  </main>;
}
