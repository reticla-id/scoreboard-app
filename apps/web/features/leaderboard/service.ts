import "server-only";
import { db } from "@/lib/db";
import type { getOwnedSession } from "@/features/sessions/data";
import type { ResultMatch } from "./calculate";
import { readFixedPairs, readPartnerMode } from "@/features/sports/padel/partner-modes";

type OwnedSession = Awaited<ReturnType<typeof getOwnedSession>>;

/** Called only by the authorized results page, never by match mutations. */
export async function calculateSessionLeaderboard(session: OwnedSession) {
  const sessionId = session.id;
  const [players, finishedMatches, eventCounts] = await Promise.all([
    db().player.findMany({ where: { sessionId }, select: { id: true, name: true, removedAt: true } }),
    db().match.findMany({ where: { sessionId, status: "FINISHED" }, select: {
      status: true, scoreA: true, scoreB: true,
      teamA: { select: { playerOneId: true, playerTwoId: true } },
      teamB: { select: { playerOneId: true, playerTwoId: true } },
    } }),
    db().matchEvent.groupBy({ by: ["playerId", "type"], where: { sessionId, match: { status: "FINISHED" } }, _count: { _all: true } }),
  ]);
  const matches: ResultMatch[] = finishedMatches.map((match) => ({
    status: match.status, scoreA: match.scoreA, scoreB: match.scoreB,
    teamA: [match.teamA.playerOneId, match.teamA.playerTwoId],
    teamB: [match.teamB.playerOneId, match.teamB.playerTwoId],
  }));
  const participants = new Set(matches.flatMap((match) => [...match.teamA, ...match.teamB]));
  const counts = eventCounts.map((entry) => ({ playerId: entry.playerId, type: entry.type, count: entry._count._all }));
  const stats = session.sportConfig.rules.calculatePlayerStats(players, counts, participants);
  const partnerMode = readPartnerMode(session.partnerMode);
  return {
    standings: session.sportConfig.rules.calculateLeaderboard(players, matches, partnerMode, readFixedPairs(session.fixedPairs)),
    playerRanking: session.sportConfig.rules.calculatePlayerRanking(stats, matches),
    partnerMode,
    scoredMatches: matches.filter((match) => match.scoreA !== null && match.scoreB !== null && match.scoreA !== match.scoreB).length,
    trackedEvents: counts.reduce((total, entry) => total + entry.count, 0),
  };
}
