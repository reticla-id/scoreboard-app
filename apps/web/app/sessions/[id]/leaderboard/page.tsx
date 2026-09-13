import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { SessionTabs } from "@/components/session-tabs";
import { requireWorkspace } from "@/lib/auth";
import { getOwnedSession } from "@/features/sessions/data";
import { sessionLifecycle } from "@/features/sessions/dates";
import { ResultsView } from "@/features/leaderboard/results-view";
import { calculateSessionLeaderboard } from "@/features/leaderboard/service";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ownerId, profile } = await requireWorkspace();
  const { id } = await params;
  const session = await getOwnedSession(ownerId, id);
  const results = await calculateSessionLeaderboard(session);
  const lifecycle = sessionLifecycle(session);
  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href={`/sessions/${id}`} />
    <header className="session-workspace-head"><p className="eyebrow"><span className="dot" /> {session.sportConfig.name.toUpperCase()} / SESSION <span className={`status-chip status-${lifecycle.toLowerCase()}`}>{lifecycle}</span></p><h1>{session.name}</h1><SessionTabs sessionId={id} active="leaderboard" /></header>
    <ResultsView sessionId={id} {...results} eventGlossary={session.sportConfig.rules.eventGlossary} />
    <footer className="site-footer"><span>RETICLA / ALPHA VERSION</span><span>@{profile.username}</span></footer>
  </main>;
}
