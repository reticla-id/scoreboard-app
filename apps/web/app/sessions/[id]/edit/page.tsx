import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { requireWorkspace } from "@/lib/auth";
import { getOwnedSession } from "@/features/sessions/data";
import { dateKey } from "@/features/sessions/dates";
import { updateSession, deleteSession } from "@/features/sessions/actions";
import { SessionForm } from "@/features/sessions/session-form";
import { DeleteSessionForm } from "@/features/sessions/delete-session-form";

export const metadata: Metadata = { title: "Edit session" };

export default async function EditSession({ params }: { params: Promise<{ id: string }> }) {
  const { id: ownerId, profile } = await requireWorkspace();
  const { id } = await params;
  const session = await getOwnedSession(ownerId, id);

  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href="/home" />
    <section className="session-editor"><p className="eyebrow"><span className="dot" /> SESSION SETTINGS</p><h1>EDIT THE<br />DETAILS.</h1><SessionForm action={updateSession.bind(null, id)} mode="edit" values={{ name: session.name, date: dateKey(session.date), startTime: session.startTime, location: session.location || "", sport: session.sport }} /></section>
    <details className="delete-disclosure"><summary>Delete session</summary><div><p className="muted">This permanently removes the session and its roster and matches.</p><DeleteSessionForm action={deleteSession.bind(null, id)} /></div></details>
  </main>;
}
