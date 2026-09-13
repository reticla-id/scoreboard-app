import type { PlayerStatRow } from "./player-stats.ts";
import type { FixedPair, PartnerMode } from "../sports/padel/partner-modes.ts";

export type LeaderboardPlayer = { id: string; name: string; removedAt?: Date | null };
export type ResultMatch = {
  status: string;
  scoreA: number | null;
  scoreB: number | null;
  teamA: [string, string];
  teamB: [string, string];
};
export type LeaderboardRow = {
  id: string;
  name: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  difference: number;
  winPercent: number;
};
export type PlayerRankingRow = PlayerStatRow & {
  wins: number;
  netScore: number;
  efficiency: number | null;
};

function pairKey(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join(":");
}

/** Match-result standings. Win rate takes priority so uneven participation is comparable. */
export function calculateLeaderboard(players: readonly LeaderboardPlayer[], matches: readonly ResultMatch[], mode: PartnerMode = "RANDOM", fixedPairs: readonly FixedPair[] = []): LeaderboardRow[] {
  const names = new Map(players.map((player) => [player.id, player.name]));
  const removed = new Set(players.filter((player) => player.removedAt).map((player) => player.id));
  const rows = new Map<string, LeaderboardRow>();
  function add(id: string, name: string) {
    if (!rows.has(id)) rows.set(id, { id, name, matchesPlayed: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, difference: 0, winPercent: 0 });
  }
  function pairName(firstId: string, secondId: string) {
    return `${names.get(firstId) ?? "Former player"} + ${names.get(secondId) ?? "Former player"}`;
  }
  if (mode === "FIXED") {
    for (const pair of fixedPairs) {
      if (names.has(pair.firstId) && names.has(pair.secondId) && pair.firstId !== pair.secondId) {
        add(pairKey(pair.firstId, pair.secondId), pairName(pair.firstId, pair.secondId));
      }
    }
  } else {
    for (const player of players) add(player.id, player.name);
  }
  for (const match of matches) {
    if (match.status !== "FINISHED" || match.scoreA === null || match.scoreB === null || match.scoreA === match.scoreB) continue;
    for (const [team, scored, conceded] of [[match.teamA, match.scoreA, match.scoreB], [match.teamB, match.scoreB, match.scoreA]] as const) {
      const id = mode === "FIXED" ? pairKey(team[0], team[1]) : "";
      if (mode === "FIXED") add(id, pairName(team[0], team[1]));
      for (const playerId of mode === "FIXED" ? [id] : team) {
        const row = rows.get(playerId);
        if (!row) continue;
        row.matchesPlayed++;
        row.wins += Number(scored > conceded);
        row.losses += Number(scored < conceded);
        row.gamesWon += scored;
        row.gamesLost += conceded;
      }
    }
  }
  return [...rows.values()]
    .filter((row) => mode === "FIXED" || row.matchesPlayed > 0 || !removed.has(row.id))
    .map((row) => ({ ...row, difference: row.gamesWon - row.gamesLost, winPercent: row.matchesPlayed ? row.wins / row.matchesPlayed * 100 : 0 }))
    .sort((a, b) => Number(b.matchesPlayed > 0) - Number(a.matchesPlayed > 0)
      || b.winPercent - a.winPercent
      || (b.matchesPlayed ? b.difference / b.matchesPlayed : 0) - (a.matchesPlayed ? a.difference / a.matchesPlayed : 0)
      || b.wins - a.wins
      || b.difference - a.difference
      || b.gamesWon - a.gamesWon
      || a.name.localeCompare(b.name)
      || a.id.localeCompare(b.id));
}

/** Individual event ranking for Player Stats, calculated only when results load. */
export function calculatePlayerRanking(stats: readonly PlayerStatRow[], matches: readonly ResultMatch[]): PlayerRankingRow[] {
  const wins = new Map(stats.map((row) => [row.id, 0]));
  for (const match of matches) {
    if (match.status !== "FINISHED" || match.scoreA === null || match.scoreB === null || match.scoreA === match.scoreB) continue;
    const winners = match.scoreA > match.scoreB ? match.teamA : match.teamB;
    for (const playerId of winners) {
      if (wins.has(playerId)) wins.set(playerId, (wins.get(playerId) ?? 0) + 1);
    }
  }
  return stats.map((row) => {
    const attempts = row.winners + row.unforcedErrors + row.doubleFaults;
    return {
      ...row,
      wins: wins.get(row.id) ?? 0,
      netScore: row.winners - row.unforcedErrors - row.doubleFaults,
      efficiency: attempts ? row.winners / attempts * 100 : null,
    };
  }).sort((a, b) => b.netScore - a.netScore
    || (b.efficiency ?? -1) - (a.efficiency ?? -1)
    || b.wins - a.wins
    || b.winners - a.winners
    || a.name.localeCompare(b.name)
    || a.id.localeCompare(b.id));
}
