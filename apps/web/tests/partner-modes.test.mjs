import assert from "node:assert/strict";
import test from "node:test";
import { generateRoundMatches, matchKey } from "../features/matches/generator.ts";
import {
  addFixedPair, generateFixedPartnerMatches, generatePadelMatches,
  padelRoundAvailability, plannedPadelMatchCount, readFixedPairs,
  readPartnerMode, removeFixedPair, validateFixedPairs,
} from "../features/sports/padel/partner-modes.ts";

const roster = (count) => Array.from({ length: count }, (_, index) => ({ id: String.fromCharCode(65 + index), name: String.fromCharCode(65 + index) }));
const pairsFor = (players) => Array.from({ length: players.length / 2 }, (_, index) => ({ firstId: players[index * 2].id, secondId: players[index * 2 + 1].id }));
const teamKey = (team) => team.map((player) => player.id).sort().join("+");

test("random mode delegates unchanged, including uneven rosters and partner variety", () => {
  for (const count of [4, 5, 7, 8]) {
    const players = roster(count);
    const matches = generatePadelMatches("RANDOM", players, [], 42);
    assert.deepEqual(matches, generateRoundMatches(players, 42));
    assert.equal(new Set(matches.map(matchKey)).size, matches.length);
    assert.equal(padelRoundAvailability("RANDOM", players, []).enabled, true);
  }
  const partnerships = new Set(generatePadelMatches("RANDOM", roster(4), [], 42).flatMap((match) => [teamKey(match.teamA), teamKey(match.teamB)]));
  assert.equal(partnerships.size, 6);
});

test("fixed mode creates every unique team matchup for 4, 6, and 8 players", () => {
  for (const count of [4, 6, 8]) {
    const players = roster(count);
    const pairs = pairsFor(players);
    const expectedTeams = new Set(pairs.map((pair) => [pair.firstId, pair.secondId].sort().join("+")));
    const matches = generateFixedPartnerMatches(players, pairs, 42);
    const expectedCount = count / 2 * (count / 2 - 1) / 2;
    assert.equal(matches.length, expectedCount);
    assert.equal(plannedPadelMatchCount("FIXED", count), expectedCount);
    assert.equal(new Set(matches.map(matchKey)).size, matches.length);
    for (const match of matches) {
      assert.equal(new Set([...match.teamA, ...match.teamB].map((player) => player.id)).size, 4);
      assert.ok(expectedTeams.has(teamKey(match.teamA)));
      assert.ok(expectedTeams.has(teamKey(match.teamB)));
    }
    assert.equal(padelRoundAvailability("FIXED", players, pairs).enabled, true);
  }
});

test("fixed pairing rejects odd, incomplete, duplicate, self, and foreign assignments", () => {
  const players = roster(6);
  const pairs = pairsFor(players);
  assert.match(validateFixedPairs(roster(7), pairs).error, /even number/);
  assert.match(validateFixedPairs(players, pairs.slice(0, 2)).error, /Every player/);
  assert.match(validateFixedPairs(players, [...pairs.slice(0, 2), pairs[0]]).error, /only one/);
  assert.match(validateFixedPairs(players, [{ firstId: "A", secondId: "A" }, ...pairs.slice(1)]).error, /cannot partner/);
  assert.match(validateFixedPairs(players, [{ firstId: "A", secondId: "X" }, ...pairs.slice(1)]).error, /no longer on this roster/);
  assert.throws(() => addFixedPair(players, [], "A", "A"), /different players/);
  assert.throws(() => addFixedPair(players, [], "A", "X"), /this roster/);
  assert.throws(() => addFixedPair(players, [{ firstId: "A", secondId: "B" }], "A", "C"), /existing pair/);
  assert.throws(() => generateFixedPartnerMatches(players, pairs.slice(0, 2), 42), /Every player/);
  assert.equal(padelRoundAvailability("FIXED", roster(7), []).enabled, false);
});

test("fixed pair changes are symmetric and saved matches keep their original teams", () => {
  const players = roster(6);
  let pairs = addFixedPair(players, [], "A", "B");
  assert.deepEqual(pairs, [{ firstId: "A", secondId: "B" }]);
  pairs = addFixedPair(players, pairs, "C", "D");
  pairs = addFixedPair(players, pairs, "E", "F");
  const persisted = readFixedPairs(JSON.parse(JSON.stringify(pairs)));
  assert.deepEqual(persisted, pairs);
  assert.equal(readPartnerMode("FIXED"), "FIXED");
  const oldMatches = generatePadelMatches("FIXED", players, persisted, 42);
  const oldKeys = oldMatches.map(matchKey);
  const revised = addFixedPair(players, removeFixedPair(removeFixedPair(pairs, "A"), "C"), "A", "C");
  const newPairs = addFixedPair(players, revised, "B", "D");
  const newMatches = generatePadelMatches("FIXED", players, newPairs, 42);
  assert.deepEqual(oldMatches.map(matchKey), oldKeys);
  assert.notDeepEqual(newMatches.map(matchKey).sort(), oldKeys.sort());
});

test("fixed schedules stay bounded for large rosters without splitting teams", () => {
  const players = Array.from({ length: 66 }, (_, index) => ({ id: `p-${index}`, name: `Player ${index}` }));
  const pairs = pairsFor(players);
  const matches = generateFixedPartnerMatches(players, pairs, 7);
  assert.equal(matches.length, 500);
  assert.equal(plannedPadelMatchCount("FIXED", players.length), 500);
  assert.equal(new Set(matches.map(matchKey)).size, matches.length);
  const allowed = new Set(pairs.map((pair) => [pair.firstId, pair.secondId].sort().join("+")));
  for (const match of matches) {
    assert.ok(allowed.has(teamKey(match.teamA)));
    assert.ok(allowed.has(teamKey(match.teamB)));
  }
});
