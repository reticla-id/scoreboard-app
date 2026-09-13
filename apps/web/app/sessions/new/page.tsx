import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { requireWorkspace } from "@/lib/auth";
import { createSession } from "@/features/sessions/actions";
import { SessionForm } from "@/features/sessions/session-form";

export const metadata: Metadata = { title: "Host Session" };

export default async function NewSession() {
  const { profile } = await requireWorkspace();
  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href="/home" />
    <section className="session-editor"><p className="eyebrow"><span className="dot" /> NEW SESSION</p><h1>SET THE<br />COURT.</h1><p className="muted">Choose the sport, name it, and pick a time.</p><SessionForm action={createSession} mode="create" /></section>
  </main>;
}
