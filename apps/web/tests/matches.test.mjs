import assert from "node:assert/strict";
import test from "node:test";
import { generateRoundMatches, matchKey, maximumUsefulMatchCount, plannedRoundMatchCount, randomizeMatchOrder } from "../features/matches/generator.ts";

const roster = (count) => Array.from({ length: count }, (_, i) => ({ id: `player-${i + 1}`, name: String.fromCharCode(65 + i) }));
const partnerKey = (a, b) => [a, b].sort().join("+");

function checkRound(players, matches, expectedCount) {
  assert.equal(matches.length, expectedCount);
  assert.equal(new Set(matches.map(matchKey)).size, matches.length, "No match may repeat by swapping team sides or players.");
  const ids = new Set(players.map((player) => player.id));
  const partners = new Set();
  const appearances = new Map(players.map((player) => [player.id, 0]));
  for (const match of matches) {
    assert.equal(match.teamA.length, 2);
    assert.equal(match.teamB.length, 2);
    const four = [...match.teamA, ...match.teamB].map((player) => player.id);
    assert.equal(new Set(four).size, 4, "Every match needs four distinct players.");
    assert.ok(four.every((id) => ids.has(id)), "Only roster players may appear.");
    for (const id of four) appearances.set(id, appearances.get(id) + 1);
    for (const team of [match.teamA, match.teamB]) {
      const key = partnerKey(team[0].id, team[1].id);
      assert.ok(!partners.has(key), `Partnership ${key} repeated.`);
      partners.add(key);
    }
  }
  const counts = [...appearances.values()];
  assert.ok(counts.every((count) => count > 0), "Every player should participate.");
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `Participation should differ by at most one match (roster ${players.length}, min ${Math.min(...counts)}, max ${Math.max(...counts)}).`);
  return partners;
}

test("0–3 players cannot generate a round", () => {
  for (let count = 0; count < 4; count++) {
    assert.equal(maximumUsefulMatchCount(count), 0);
    assert.throws(() => generateRoundMatches(roster(count), 1), /at least 4/i);
  }
});

test("4 players produce the exact three canonical matches and all six partnerships", () => {
  const players = roster(4);
  const matches = generateRoundMatches(players, 15);
  const names = matches.map((match) => [match.teamA.map((player) => player.name).sort().join("+"), match.teamB.map((player) => player.name).sort().join("+")].sort().join("/")).sort();
  assert.deepEqual(names, ["A+B/C+D", "A+C/B+D", "A+D/B+C"]);
  assert.equal(checkRound(players, matches, 3).size, 6);
  assert.equal(matchKey({ teamA: matches[0].teamB.toReversed(), teamB: matches[0].teamA.toReversed() }), matchKey(matches[0]));
});

for (const [count, expected] of [[5, 5], [6, 7], [7, 10], [8, 14], [9, 18], [10, 22], [11, 27], [12, 33]]) {
  test(`${count} players: ${expected} useful balanced matches with maximal unique partnerships`, () => {
    const players = roster(count);
    const matches = generateRoundMatches(players, 20260912);
    const partners = checkRound(players, matches, expected);
    assert.equal(maximumUsefulMatchCount(count), expected);
    assert.equal(partners.size, Math.min(count * (count - 1) / 2, expected * 2));
  });
}

test("different seeds vary pairings or order without changing validity or coverage", () => {
  const players = roster(8);
  const first = generateRoundMatches(players, 15);
  const second = generateRoundMatches(players, 16);
  assert.deepEqual(first, generateRoundMatches(players.toReversed(), 15));
  assert.notDeepEqual(first.map(matchKey), second.map(matchKey));
  checkRound(players, second, 14);
  assert.deepEqual(randomizeMatchOrder(first, 99), randomizeMatchOrder(first, 99));
  assert.deepEqual(randomizeMatchOrder(first, 99).map(matchKey).toSorted(), first.map(matchKey).toSorted());
  assert.throws(() => randomizeMatchOrder(first, -1), /seed/i);
});

test("a changed roster creates an independent new round without modifying the old pairings", () => {
  const first = generateRoundMatches(roster(4), 2);
  const saved = first.map(matchKey);
  const second = generateRoundMatches(roster(6), 3);
  checkRound(roster(6), second, 7);
  assert.deepEqual(first.map(matchKey), saved);
});

test("large rosters remain usable with unique partners and balanced participation", () => {
  const players = roster(46);
  assert.equal(plannedRoundMatchCount(players.length), 500);
  checkRound(players, generateRoundMatches(players, 9), 500);
});

test("the factorization stays complete and balanced across roster sizes", () => {
  for (let count = 4; count <= 63; count++) {
    const players = roster(count);
    for (const seed of [1, 17, 99]) checkRound(players, generateRoundMatches(players, seed), plannedRoundMatchCount(count));
  }
});

test("a 500-player roster yields a practical balanced round", () => {
  const players = roster(500);
  checkRound(players, generateRoundMatches(players, 11), 500);
});

test("capped non-divisible rosters retain unique partnerships and fair turns", () => {
  for (const count of [47, 49, 64, 65, 66, 67, 97, 98, 99, 197, 198, 199, 497, 498, 499]) {
    const players = roster(count);
    for (const seed of [11, 29]) checkRound(players, generateRoundMatches(players, seed), 500);
  }
});

test("every supported roster size from 64 to 500 produces a valid practical round", () => {
  for (let count = 64; count <= 500; count++) {
    const players = roster(count);
    checkRound(players, generateRoundMatches(players, 7), 500);
  }
});

test("duplicate roster IDs and invalid seeds fail clearly", () => {
  assert.throws(() => generateRoundMatches([...roster(4), roster(4)[0]], 1), /duplicate/i);
  assert.throws(() => generateRoundMatches(roster(4), -1), /seed/i);
});
