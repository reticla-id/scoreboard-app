export type GeneratorPlayer = { id: string; name: string };
export type Pairing<T extends GeneratorPlayer = GeneratorPlayer> = { teamA: [T, T]; teamB: [T, T] };
type PartnerPair = [number, number];
type Candidate = { teamA: PartnerPair; teamB: PartnerPair };

// Every match consumes two disjoint partnerships. K(n) has C(n, 2) possible
// partnerships, so floor(C(n, 2) / 2) is the upper bound without repeats.
// A round-robin one-factorization divides K(n) into groups of disjoint pairs.
// Pairing edges within groups and then across leftover groups reaches that
// upper bound. A practical round selects 1,000 edges (= 500 matches) from
// complete factors plus a balanced partial factor when the full set is larger.
export const MAX_ROUND_MATCHES = 500;

export function maximumUsefulMatchCount(playerCount: number): number {
  if (!Number.isSafeInteger(playerCount) || playerCount < 0) throw new Error("Invalid player count.");
  return playerCount < 4 ? 0 : Math.floor(playerCount * (playerCount - 1) / 4);
}

export function plannedRoundMatchCount(playerCount: number): number {
  return Math.min(maximumUsefulMatchCount(playerCount), MAX_ROUND_MATCHES);
}

export function matchKey(match: Pairing): string {
  return [match.teamA, match.teamB]
    .map((team) => team.map((player) => player.id).sort().join("+"))
    .sort().join("/");
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const random = seededRandom(seed);
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function disjoint(first: PartnerPair, second: PartnerPair): boolean {
  return first[0] !== second[0] && first[0] !== second[1] && first[1] !== second[0] && first[1] !== second[1];
}

function factorize(playerCount: number): PartnerPair[][] {
  const size = playerCount % 2 === 0 ? playerCount : playerCount + 1;
  let ring = Array.from({ length: size }, (_, index) => index); // Dummy index provides a bye for odd rosters.
  const factors: PartnerPair[][] = [];
  for (let factor = 0; factor < size - 1; factor++) {
    const pairs: PartnerPair[] = [];
    for (let index = 0; index < size / 2; index++) {
      const pair: PartnerPair = [ring[index], ring[size - 1 - index]];
      if (pair[0] < playerCount && pair[1] < playerCount) pairs.push(pair);
    }
    factors.push(pairs);
    ring = [ring[0], ring[size - 1], ...ring.slice(1, -1)];
  }
  return factors;
}

function pairLeftovers(leftovers: PartnerPair[]): { matches: Candidate[]; unused: number } {
  const matches: Candidate[] = [];
  const used = new Set<number>();
  for (let first = 0; first < leftovers.length; first++) {
    if (used.has(first)) continue;
    const second = leftovers.findIndex((pair, index) => index > first && !used.has(index) && disjoint(leftovers[first], pair));
    if (second < 0) continue;
    used.add(first); used.add(second);
    matches.push({ teamA: leftovers[first], teamB: leftovers[second] });
  }
  let unmatched = leftovers.map((_, index) => index).filter((index) => !used.has(index));
  while (unmatched.length > 1) {
    const [first, second] = unmatched;
    const replacement = matches.findIndex((match) =>
      (disjoint(leftovers[first], match.teamA) && disjoint(leftovers[second], match.teamB)) ||
      (disjoint(leftovers[first], match.teamB) && disjoint(leftovers[second], match.teamA)));
    if (replacement < 0) throw new Error("Could not pair all partnerships into matches.");
    const previous = matches[replacement];
    if (disjoint(leftovers[first], previous.teamA) && disjoint(leftovers[second], previous.teamB)) {
      matches[replacement] = { teamA: leftovers[first], teamB: previous.teamA };
      matches.push({ teamA: leftovers[second], teamB: previous.teamB });
    } else {
      matches[replacement] = { teamA: leftovers[first], teamB: previous.teamB };
      matches.push({ teamA: leftovers[second], teamB: previous.teamA });
    }
    unmatched = unmatched.slice(2);
  }
  return { matches, unused: unmatched.length };
}

function pairFactors(factors: readonly PartnerPair[][], expectedMatches: number): Candidate[] {
  const matches: Candidate[] = [];
  const leftovers: PartnerPair[] = [];
  for (const pairs of factors) {
    for (let index = 0; index + 1 < pairs.length; index += 2) matches.push({ teamA: pairs[index], teamB: pairs[index + 1] });
    if (pairs.length % 2) leftovers.push(pairs[pairs.length - 1]);
  }
  const paired = pairLeftovers(leftovers);
  matches.push(...paired.matches);
  if (matches.length !== expectedMatches) throw new Error("Could not complete the partner schedule.");
  return matches;
}

function choosePracticalFactors(factors: readonly PartnerPair[][], playerCount: number, seed: number): PartnerPair[][] {
  const edgesNeeded = MAX_ROUND_MATCHES * 2;
  const edgesPerFactor = factors[0].length;
  const complete = Math.floor(edgesNeeded / edgesPerFactor);
  const remainder = edgesNeeded % edgesPerFactor;
  const chosen = factors.slice(0, complete);
  if (!remainder) return chosen;
  const appearances = Array<number>(playerCount).fill(0);
  for (const factor of chosen) for (const [a, b] of factor) { appearances[a]++; appearances[b]++; }
  const random = seededRandom(seed);
  const partial = factors[complete].map((pair) => ({
    pair, tie: random(), peak: Math.max(appearances[pair[0]], appearances[pair[1]]),
    sum: appearances[pair[0]] + appearances[pair[1]],
  })).sort((first, second) => first.peak - second.peak || first.sum - second.sum || first.tie - second.tie);
  chosen.push(partial.slice(0, remainder).map(({ pair }) => pair));
  return chosen;
}

export function randomizeMatchOrder<T extends GeneratorPlayer>(matches: readonly Pairing<T>[], seed: number): Pairing<T>[] {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Invalid generation seed.");
  return shuffled(matches, seed);
}

export function generateRoundMatches<T extends GeneratorPlayer>(players: readonly T[], seed: number): Pairing<T>[] {
  if (players.length < 4) throw new Error("At least 4 players are required for padel.");
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Invalid generation seed.");
  const sorted = [...players].sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(sorted.map((player) => player.id)).size !== sorted.length) throw new Error("Roster contains a duplicate player.");
  const orderedPlayers = shuffled(sorted, seed); // Seed varies equivalent assignments, never coverage.
  const allFactors = factorize(players.length);
  const chosenFactors = maximumUsefulMatchCount(players.length) > MAX_ROUND_MATCHES
    ? choosePracticalFactors(allFactors, players.length, (seed ^ 0x9E3779B9) >>> 0)
    : allFactors;
  const candidates = pairFactors(chosenFactors, plannedRoundMatchCount(players.length));
  const matches = candidates.map((match): Pairing<T> => ({
    teamA: [orderedPlayers[match.teamA[0]], orderedPlayers[match.teamA[1]]],
    teamB: [orderedPlayers[match.teamB[0]], orderedPlayers[match.teamB[1]]],
  }));
  return randomizeMatchOrder(matches, (seed ^ 0x85EBCA6B) >>> 0);
}
