import { MAX_ROUND_MATCHES, generateRoundMatches, type GeneratorPlayer } from "../../matches/generator.ts";
import { generateFixedPartnerMatches, padelRoundAvailability, type FixedPair, type PartnerMode } from "../padel/partner-modes.ts";
import type { MatchFormat } from "../formats.ts";

export type TennisPairing<T extends GeneratorPlayer = GeneratorPlayer> = { teamA: [T] | [T, T]; teamB: [T] | [T, T] };

export function tennisMinimumPlayers(format: MatchFormat) { return format === "SINGLES" ? 2 : 4; }

export function tennisRoundAvailability<T extends GeneratorPlayer>(format: MatchFormat, mode: PartnerMode, players: readonly T[], pairs: readonly FixedPair[]) {
  if (format === "DOUBLES") return padelRoundAvailability(mode, players, pairs, 4);
  const matchCount = Math.min(MAX_ROUND_MATCHES, players.length * (players.length - 1) / 2);
  return players.length < 2
    ? { enabled: false, message: "At least 2 players are required for tennis singles.", matchCount: 0 }
    : { enabled: true, message: `${matchCount.toLocaleString("en-US")} singles matches from these ${players.length} players.`, matchCount };
}

export function generateTennisMatches<T extends GeneratorPlayer>(format: MatchFormat, mode: PartnerMode, players: readonly T[], pairs: readonly FixedPair[], seed: number): TennisPairing<T>[] {
  if (format === "DOUBLES") return mode === "FIXED" ? generateFixedPartnerMatches(players, pairs, seed) : generateRoundMatches(players, seed);
  if (players.length < 2) throw new Error("At least 2 players are required for tennis singles.");
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Invalid generation seed.");
  const sorted = [...players].sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(sorted.map((player) => player.id)).size !== sorted.length) throw new Error("Roster contains a duplicate player.");
  const matches: TennisPairing<T>[] = [];
  for (let first = 0; first < sorted.length; first++) for (let second = first + 1; second < sorted.length; second++) matches.push({ teamA: [sorted[first]], teamB: [sorted[second]] });
  let state = seed >>> 0;
  const randomized = [...matches];
  for (let index = randomized.length - 1; index > 0; index--) {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    const swap = Math.floor((((value ^ value >>> 14) >>> 0) / 4294967296) * (index + 1));
    [randomized[index], randomized[swap]] = [randomized[swap], randomized[index]];
  }
  return randomized.slice(0, MAX_ROUND_MATCHES);
}
