import { EVENT_TYPES, type EventType } from "../matches/scoring.ts";
import type { LeaderboardPlayer } from "./calculate.ts";

export type PlayerEventCount = { playerId: string; type: string; count: number };
export type PlayerStatRow = {
  id: string;
  name: string;
  winners: number;
  forcedErrors: number;
  unforcedErrors: number;
  doubleFaults: number;
};

export function calculatePlayerStats(players: readonly LeaderboardPlayer[], counts: readonly PlayerEventCount[], participatedPlayerIds: ReadonlySet<string> = new Set()): PlayerStatRow[] {
  const rows = new Map(players.map((player) => [player.id, {
    id: player.id, name: player.name, removedAt: Boolean(player.removedAt),
    W: 0, FE: 0, UE: 0, DF: 0,
  }]));
  for (const { playerId, type, count } of counts) {
    const row = rows.get(playerId);
    if (!row || !EVENT_TYPES.includes(type as EventType) || !Number.isSafeInteger(count) || count < 0) continue;
    row[type as EventType] += count;
  }
  return [...rows.values()]
    .filter((row) => !row.removedAt || participatedPlayerIds.has(row.id) || row.W + row.FE + row.UE + row.DF > 0)
    .map((row) => ({ id: row.id, name: row.name, winners: row.W, forcedErrors: row.FE, unforcedErrors: row.UE, doubleFaults: row.DF }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
