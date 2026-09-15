import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { SessionWorkspaceHeading } from "@/components/session-workspace-heading";
import { AppFooter } from "@/components/app-footer";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedSession } from "@/features/sessions/data";
import { MatchWorkspace, type RoundView } from "@/features/matches/match-workspace";

export const metadata: Metadata = { title: "Matches" };

function positiveNumber(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

export default async function MatchesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ round?: string; page?: string }> }) {
  const { id: ownerId, profile } = await requireWorkspace();
  const { id } = await params;
  const session = await getOwnedSession(ownerId, id);
  const query = await searchParams;
  const rounds = await db().round.findMany({ where: { sessionId: id }, orderBy: { number: "desc" }, select: { id: true, number: true, waitingPlayerIds: true, _count: { select: { matches: true } } } });
  const selected = rounds.find((round) => round.number === positiveNumber(query.round)) ?? rounds[0];
  const pages = selected ? Math.ceil(selected._count.matches / 50) : 0;
  const page = Math.min(positiveNumber(query.page) ?? 1, Math.max(pages, 1));
  const [players, matches] = selected ? await Promise.all([
    selected.waitingPlayerIds.length ? db().player.findMany({ where: { sessionId: id, id: { in: selected.waitingPlayerIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    db().match.findMany({ where: { sessionId: id, roundId: selected.id }, orderBy: { position: "asc" }, skip: (page - 1) * 50, take: 50, include: { teamA: { include: { playerOne: true, playerTwo: true } }, teamB: { include: { playerOne: true, playerTwo: true } } } }),
  ]) : [[], []] as const;
  const eventCounts = matches.length ? await db().matchEvent.groupBy({
    by: ["matchId", "playerId", "type"],
    where: { sessionId: id, matchId: { in: matches.map((match) => match.id) } },
    _count: { _all: true },
  }) : [];
  const names = new Map(players.map((player) => [player.id, player.name]));
  const current: RoundView | null = selected ? { id: selected.id, number: selected.number, matchCount: selected._count.matches, waiting: selected.waitingPlayerIds.map((playerId) => names.get(playerId) ?? "Former player"), matches: matches.map((match) => ({ id: match.id, updatedAt: match.updatedAt.toISOString(), position: match.position, status: match.status, scoreA: match.scoreA, scoreB: match.scoreB, teamA: [{ id: match.teamA.playerOne.id, name: match.teamA.playerOne.name }, { id: match.teamA.playerTwo.id, name: match.teamA.playerTwo.name }], teamB: [{ id: match.teamB.playerOne.id, name: match.teamB.playerOne.name }, { id: match.teamB.playerTwo.id, name: match.teamB.playerTwo.name }], eventCounts: eventCounts.filter((entry) => entry.matchId === match.id).map((entry) => ({ playerId: entry.playerId, type: entry.type, count: entry._count._all })) })) } : null;
  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href="/home" />
    <SessionWorkspaceHeading session={session} active="matches" />
    <MatchWorkspace sessionId={session.id} rounds={rounds.map((round) => ({ id: round.id, number: round.number, matchCount: round._count.matches }))} current={current} page={page} pages={pages} completed={!!session.completedAt} minimumPlayers={session.sportConfig.rules.minimumPlayers} eventGlossary={session.sportConfig.rules.eventGlossary} />
    <AppFooter />
  </main>;
}
