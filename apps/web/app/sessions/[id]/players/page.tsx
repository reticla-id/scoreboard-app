import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { SessionTabs } from "@/components/session-tabs";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedSession } from "@/features/sessions/data";
import { sessionLifecycle } from "@/features/sessions/dates";
import { Roster } from "@/features/players/roster";
import { GenerateRoundForm } from "@/features/matches/generate-round-form";
import { PartnerModePanel } from "@/features/partners/partner-mode-panel";
import { readFixedPairs, readPartnerMode } from "@/features/sports/padel/partner-modes";

export const metadata: Metadata = { title: "Players" };

export default async function PlayersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ownerId, profile } = await requireWorkspace();
  const { id } = await params;
  const session = await getOwnedSession(ownerId, id);
  const [players, roundCount] = await Promise.all([
    db().player.findMany({ where: { sessionId: session.id, removedAt: null }, select: { id: true, name: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    db().round.count({ where: { sessionId: session.id } }),
  ]);
  const lifecycle = sessionLifecycle(session);
  const partnerMode = readPartnerMode(session.partnerMode);
  const fixedPairs = readFixedPairs(session.fixedPairs);
  const fixedConfigurationLocked = partnerMode === "FIXED" && roundCount > 0;
  const availability = session.sportConfig.rules.padelRoundAvailability(partnerMode, players, fixedPairs, session.sportConfig.rules.minimumPlayers);
  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href={`/sessions/${session.id}`} />
    <header className="session-workspace-head"><p className="eyebrow"><span className="dot" /> {session.sportConfig.name.toUpperCase()} / SESSION <span className={`status-chip status-${lifecycle.toLowerCase()}`}>{lifecycle}</span></p><h1>{session.name}</h1><SessionTabs sessionId={session.id} active="players" /></header>
    <Roster players={players} sessionId={session.id} readOnly={!!session.completedAt || fixedConfigurationLocked} lockReason={fixedConfigurationLocked ? "Reset Matches before changing a fixed-partner roster." : undefined} minimumPlayers={session.sportConfig.rules.minimumPlayers} sportName={session.sportConfig.name} />
    {players.length > 0 && <PartnerModePanel sessionId={session.id} players={players} mode={partnerMode} pairs={fixedPairs} locked={!!session.completedAt || roundCount > 0} hasRounds={roundCount > 0} completed={!!session.completedAt} />}
    <GenerateRoundForm sessionId={session.id} nextNumber={roundCount + 1} availability={availability} locked={!!session.completedAt} />
    <footer className="site-footer"><span>RETICLA / ALPHA VERSION</span><span>@{profile.username}</span></footer>
  </main>;
}
