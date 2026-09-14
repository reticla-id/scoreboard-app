import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { SessionWorkspaceHeading } from "@/components/session-workspace-heading";
import { AppFooter } from "@/components/app-footer";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedSession } from "@/features/sessions/data";
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
  const partnerMode = readPartnerMode(session.partnerMode);
  const fixedPairs = readFixedPairs(session.fixedPairs);
  const fixedConfigurationLocked = partnerMode === "FIXED" && roundCount > 0;
  const availability = session.sportConfig.rules.padelRoundAvailability(partnerMode, players, fixedPairs, session.sportConfig.rules.minimumPlayers);
  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href={`/sessions/${session.id}`} />
    <SessionWorkspaceHeading session={session} active="players" />
    <div className="session-section-heading"><h2>PLAYERS.</h2></div>
    <Roster players={players} sessionId={session.id} readOnly={!!session.completedAt || fixedConfigurationLocked} lockReason={fixedConfigurationLocked ? "Reset Matches before changing a fixed-partner roster." : undefined} minimumPlayers={session.sportConfig.rules.minimumPlayers} sportName={session.sportConfig.name} />
    {players.length > 0 && <PartnerModePanel sessionId={session.id} players={players} mode={partnerMode} pairs={fixedPairs} locked={!!session.completedAt || roundCount > 0} hasRounds={roundCount > 0} completed={!!session.completedAt} />}
    <GenerateRoundForm sessionId={session.id} nextNumber={roundCount + 1} availability={availability} locked={!!session.completedAt} />
    <AppFooter />
  </main>;
}
