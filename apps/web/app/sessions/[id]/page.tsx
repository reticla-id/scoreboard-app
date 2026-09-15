import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { BackLink } from "@/components/back-link";
import { requireWorkspace } from "@/lib/auth";
import { getOwnedSession } from "@/features/sessions/data";
import { db } from "@/lib/db";
import { SessionWorkspaceHeading } from "@/components/session-workspace-heading";
import { AppFooter } from "@/components/app-footer";
import { ArrowUpRightIcon } from "@/components/action-icons";
import { FinishSessionForm } from "@/features/sessions/finish-session-form";
import { readFixedPairs, readPartnerMode, validateFixedPairs } from "@/features/sports/padel/partner-modes";

export const metadata: Metadata = { title: "Session detail" };

export default async function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: ownerId, profile } = await requireWorkspace();
  const { id } = await params;
  const session = await getOwnedSession(ownerId, id);
  const partnerMode = readPartnerMode(session.partnerMode);
  const [roster, roundCount, matchCounts] = await Promise.all([
    partnerMode === "FIXED"
      ? db().player.findMany({ where: { sessionId: session.id, removedAt: null }, select: { id: true, name: true } })
      : db().player.count({ where: { sessionId: session.id, removedAt: null } }),
    db().round.count({ where: { sessionId: session.id } }),
    db().match.groupBy({ by: ["status"], where: { sessionId: session.id }, _count: { _all: true } }),
  ]);
  const count = (status: string) => matchCounts.find((item) => item.status === status)?._count._all ?? 0;
  const upcomingCount = count("UPCOMING"), liveCount = count("LIVE"), finishedCount = count("FINISHED");
  const totalMatches = upcomingCount + liveCount + finishedCount;
  const minimumPlayers = session.sportConfig.rules.minimumPlayers;
  const playerCount = typeof roster === "number" ? roster : roster.length;
  const fixedPairs = readFixedPairs(session.fixedPairs);
  const needsPartners = partnerMode === "FIXED" && Array.isArray(roster) && !!validateFixedPairs(roster, fixedPairs, minimumPlayers).error;

  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href="/home" />
    <SessionWorkspaceHeading session={session} active="overview" />
    <section className="session-court-progress" aria-labelledby="overview-heading"><div className="session-progress-intro"><h2 id="overview-heading">OVERVIEW</h2><h3>{session.completedAt ? "SESSION FINISHED." : liveCount ? "GAMES IN PLAY." : roundCount ? "MATCHES ARE READY." : playerCount < minimumPlayers ? "START WITH PLAYERS." : needsPartners ? "SET PARTNERS." : "READY FOR ROUND 1."}</h3><p className="muted">{session.completedAt ? "Roster and rounds are locked. You can still correct scores and review results." : roundCount ? `${roundCount} round${roundCount === 1 ? "" : "s"} generated. Open Matches to run games and record scores.` : playerCount < minimumPlayers ? `Build your roster. ${minimumPlayers} players are needed for ${session.sportConfig.name.toLowerCase()} doubles.` : needsPartners ? "Pair every player on the Players screen before generating a round." : "The roster is ready. Generate the first round from Players."}</p><Link className={session.completedAt ? "button" : "button button-secondary"} href={roundCount ? `/sessions/${session.id}/matches` : `/sessions/${session.id}/players`}>{roundCount ? "Open matches" : session.completedAt ? "View players" : playerCount < minimumPlayers ? "Add players" : needsPartners ? "Set partners" : "Review roster"}<ArrowUpRightIcon /></Link></div><div className="session-metrics" aria-label="Session totals"><div><span>PLAYERS</span><strong>{playerCount}</strong></div><div><span>TOTAL MATCHES</span><strong>{totalMatches}</strong></div><div><span>UPCOMING</span><strong>{upcomingCount}</strong></div><div><span>LIVE</span><strong>{liveCount}</strong></div><div><span>FINISHED</span><strong>{finishedCount}</strong></div></div></section>
    {!session.completedAt && <FinishSessionForm sessionId={session.id} />}
    <AppFooter />
  </main>;
}
