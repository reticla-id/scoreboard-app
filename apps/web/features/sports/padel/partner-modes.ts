import {
  generateRoundMatches,
  matchKey,
  MAX_ROUND_MATCHES,
  plannedRoundMatchCount,
  randomizeMatchOrder,
  type GeneratorPlayer,
  type Pairing,
} from "../../matches/generator.ts";

export type PartnerMode = "RANDOM" | "FIXED";
export type FixedPair = { firstId: string; secondId: string };
type PairedPlayer = GeneratorPlayer;

export function readPartnerMode(value: string): PartnerMode {
  if (value === "RANDOM" || value === "FIXED") return value;
  throw new Error("Unsupported partner mode.");
}

export function readFixedPairs(value: unknown): FixedPair[] {
  if (!Array.isArray(value)) throw new Error("Invalid saved partner assignments.");
  return value.map((pair) => {
    if (!pair || typeof pair !== "object" || typeof pair.firstId !== "string" || typeof pair.secondId !== "string") {
      throw new Error("Invalid saved partner assignments.");
    }
    return { firstId: pair.firstId, secondId: pair.secondId };
  });
}

export function addFixedPair<T extends PairedPlayer>(players: readonly T[], pairs: readonly FixedPair[], firstId: string, secondId: string): FixedPair[] {
  if (firstId === secondId) throw new Error("Choose two different players.");
  const playerIds = new Set(players.map((player) => player.id));
  if (!playerIds.has(firstId) || !playerIds.has(secondId)) throw new Error("Choose players from this roster.");
  const assigned = new Set(pairs.flatMap((pair) => [pair.firstId, pair.secondId]));
  if (assigned.has(firstId) || assigned.has(secondId)) throw new Error("Remove the existing pair before assigning a new partner.");
  return [...pairs, { firstId, secondId }];
}

export function removeFixedPair(pairs: readonly FixedPair[], playerId: string): FixedPair[] {
  return pairs.filter((pair) => pair.firstId !== playerId && pair.secondId !== playerId);
}

export function validateFixedPairs<T extends PairedPlayer>(players: readonly T[], pairs: readonly FixedPair[], minimumPlayers = 4): { teams: [T, T][]; error?: never } | { teams?: never; error: string } {
  if (players.length < minimumPlayers) return { error: `At least ${minimumPlayers} players are required.` };
  if (players.length % 2) return { error: "Fixed Partners requires an even number of players." };
  const byId = new Map(players.map((player) => [player.id, player]));
  if (byId.size !== players.length) return { error: "The roster contains duplicate players." };
  const used = new Set<string>();
  const teams: [T, T][] = [];
  for (const pair of pairs) {
    if (pair.firstId === pair.secondId) return { error: "A player cannot partner with themselves." };
    const first = byId.get(pair.firstId), second = byId.get(pair.secondId);
    if (!first || !second) return { error: "A saved partner is no longer on this roster. Remove that pair." };
    if (used.has(pair.firstId) || used.has(pair.secondId)) return { error: "Each player can have only one fixed partner." };
    used.add(pair.firstId); used.add(pair.secondId);
    teams.push([first, second]);
  }
  if (used.size !== players.length) return { error: "Every player needs a fixed partner before generating a round." };
  return { teams };
}

export function plannedPadelMatchCount(mode: PartnerMode, playerCount: number): number {
  if (mode === "RANDOM") return plannedRoundMatchCount(playerCount);
  const teamCount = Math.floor(playerCount / 2);
  return playerCount >= 4 && playerCount % 2 === 0 ? Math.min(MAX_ROUND_MATCHES, teamCount * (teamCount - 1) / 2) : 0;
}

export function padelRoundAvailability<T extends PairedPlayer>(mode: PartnerMode, players: readonly T[], pairs: readonly FixedPair[], minimumPlayers = 4): { enabled: boolean; message: string; matchCount: number } {
  if (mode === "RANDOM") {
    return players.length < minimumPlayers
      ? { enabled: false, message: `At least ${minimumPlayers} players are required for padel.`, matchCount: 0 }
      : { enabled: true, message: `${plannedRoundMatchCount(players.length).toLocaleString("en-US")} balanced doubles matches from these ${players.length} players.`, matchCount: plannedRoundMatchCount(players.length) };
  }
  const checked = validateFixedPairs(players, pairs, minimumPlayers);
  return checked.error
    ? { enabled: false, message: checked.error, matchCount: 0 }
    : { enabled: true, message: `${plannedPadelMatchCount(mode, players.length).toLocaleString("en-US")} matches with partners kept together.`, matchCount: plannedPadelMatchCount(mode, players.length) };
}

export function generateFixedPartnerMatches<T extends PairedPlayer>(players: readonly T[], pairs: readonly FixedPair[], seed: number): Pairing<T>[] {
  const checked = validateFixedPairs(players, pairs);
  if (!checked.teams) throw new Error(checked.error);
  const teams = checked.teams.sort((first, second) => first.map((player) => player.id).sort().join(":").localeCompare(second.map((player) => player.id).sort().join(":")));
  const matches: Pairing<T>[] = [];
  for (let first = 0; first < teams.length; first++) {
    for (let second = first + 1; second < teams.length; second++) matches.push({ teamA: teams[first], teamB: teams[second] });
  }
  const randomized = randomizeMatchOrder(matches, seed);
  const selected = randomized.slice(0, MAX_ROUND_MATCHES);
  if (new Set(selected.map(matchKey)).size !== selected.length) throw new Error("Duplicate fixed-team match generated.");
  return selected;
}

export function generatePadelMatches<T extends PairedPlayer>(mode: PartnerMode, players: readonly T[], pairs: readonly FixedPair[], seed: number): Pairing<T>[] {
  return mode === "FIXED" ? generateFixedPartnerMatches(players, pairs, seed) : generateRoundMatches(players, seed);
}
