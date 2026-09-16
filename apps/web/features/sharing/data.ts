import "server-only";

import { db } from "@/lib/db";
import { resolveSport } from "@/features/sports/sport-registry";
import { calculateSessionLeaderboard } from "@/features/leaderboard/service";
import { publicTokenIsValid } from "./share-token";

const MATCHES_PER_PAGE = 60;
const PLAYERS_PER_PAGE = 24;

export async function getActiveSessionShare(sessionId: string) {
  return db().sessionShare.findFirst({ where: { sessionId, expiresAt: { gt: new Date() } }, select: { token: true, expiresAt: true } });
}

export async function getPublicSession(token: string, requestedRound?: number, requestedPage = 1, requestedPlayerPage = 1) {
  if (!publicTokenIsValid(token)) return null;
  const share = await db().sessionShare.findUnique({
    where: { token },
    select: {
      expiresAt: true,
      session: { select: { id: true, name: true, date: true, startTime: true, location: true, sport: true, partnerMode: true, fixedPairs: true, updatedAt: true } },
    },
  });
  if (!share || share.expiresAt.getTime() <= Date.now()) return null;

  const session = { ...share.session, sportConfig: resolveSport(share.session.sport) };
  const [playerCount, matchCount, statusCounts, latestMatch, results, rounds] = await Promise.all([
    db().player.count({ where: { sessionId: session.id, removedAt: null } }),
    db().match.count({ where: { sessionId: session.id } }),
    db().match.groupBy({ by: ["status"], where: { sessionId: session.id }, _count: { _all: true } }),
    db().match.aggregate({ where: { sessionId: session.id }, _max: { updatedAt: true } }),
    calculateSessionLeaderboard(session),
    db().round.findMany({ where: { sessionId: session.id }, orderBy: { number: "desc" }, select: { id: true, number: true, _count: { select: { matches: true } } } }),
  ]);
  const selected = rounds.find((round) => round.number === requestedRound) ?? rounds[0];
  const selectedMatchCount = selected?._count.matches ?? 0;
  const pages = Math.max(1, Math.ceil(selectedMatchCount / MATCHES_PER_PAGE));
  const page = Math.min(Math.max(1, requestedPage), pages);
  const playerPages = Math.max(1, Math.ceil(playerCount / PLAYERS_PER_PAGE));
  const playerPage = Math.min(Math.max(1, requestedPlayerPage), playerPages);
  const [rawMatches, players] = await Promise.all([selected ? db().match.findMany({
    where: { sessionId: session.id, roundId: selected.id },
    orderBy: { position: "asc" },
    skip: (page - 1) * MATCHES_PER_PAGE,
    take: MATCHES_PER_PAGE,
    select: {
      id: true, position: true, status: true, scoreA: true, scoreB: true,
      teamA: { select: { playerOne: { select: { id: true, name: true } }, playerTwo: { select: { id: true, name: true } } } },
      teamB: { select: { playerOne: { select: { id: true, name: true } }, playerTwo: { select: { id: true, name: true } } } },
    },
  }) : Promise.resolve([]), db().player.findMany({
    where: { sessionId: session.id, removedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    skip: (playerPage - 1) * PLAYERS_PER_PAGE,
    take: PLAYERS_PER_PAGE,
    select: { id: true, name: true },
  })]);
  const eventCounts = rawMatches.length > 0 ? await db().matchEvent.groupBy({
    by: ["matchId", "playerId", "type"],
    where: { sessionId: session.id, matchId: { in: rawMatches.map((match) => match.id) } },
    _count: { _all: true },
  }) : [];
  const matches = rawMatches.map((match) => ({
    ...match,
    eventCounts: eventCounts.filter((entry) => entry.matchId === match.id).map((entry) => ({ playerId: entry.playerId, type: entry.type, count: entry._count._all })),
  }));
  const count = (status: string) => statusCounts.find((entry) => entry.status === status)?._count._all ?? 0;
  const latest = latestMatch._max.updatedAt && latestMatch._max.updatedAt > session.updatedAt ? latestMatch._max.updatedAt : session.updatedAt;

  return {
    session,
    expiresAt: share.expiresAt,
    lastUpdated: latest,
    counts: { players: playerCount, matches: matchCount, upcoming: count("UPCOMING"), live: count("LIVE"), finished: count("FINISHED") },
    matches,
    players,
    playerPage,
    playerPages,
    rounds: rounds.map((round) => ({ id: round.id, number: round.number, matchCount: round._count.matches })),
    selectedRound: selected ? { id: selected.id, number: selected.number, matchCount: selectedMatchCount } : null,
    page,
    pages,
    results,
  };
}
