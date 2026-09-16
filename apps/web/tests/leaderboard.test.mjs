import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateLeaderboard, calculatePlayerRanking } from "../features/leaderboard/calculate.ts";
import { calculatePlayerStats } from "../features/leaderboard/player-stats.ts";

const players = [
  { id: "A", name: "Andi" }, { id: "B", name: "Budi" },
  { id: "C", name: "Charlie" }, { id: "D", name: "Dimas" },
  { id: "E", name: "Eka" }, { id: "F", name: "Fajar" },
];
const match = (teamA, teamB, scoreA, scoreB, status = "FINISHED") => ({ teamA, teamB, scoreA, scoreB, status });
const counts = (playerId, W, FE, UE, DF) => [
  { playerId, type: "W", count: W }, { playerId, type: "FE", count: FE },
  { playerId, type: "UE", count: UE }, { playerId, type: "DF", count: DF },
];

test("default leaderboard restores wins, losses, difference, and win rate", () => {
  const rows = calculateLeaderboard(players.slice(0, 4), [
    match(["A", "B"], ["C", "D"], 6, 4),
    match(["A", "C"], ["B", "D"], 2, 6),
    match(["A", "B"], ["C", "D"], 99, 0, "LIVE"),
  ]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  assert.deepEqual(byId.get("B"), { id: "B", name: "Budi", matchesPlayed: 2, wins: 2, losses: 0, gamesWon: 12, gamesLost: 6, difference: 6, winPercent: 100 });
  assert.deepEqual(byId.get("A"), { id: "A", name: "Andi", matchesPlayed: 2, wins: 1, losses: 1, gamesWon: 8, gamesLost: 10, difference: -2, winPercent: 50 });
  assert.equal(rows[0].id, "B");
});

test("odd-roster participation is ranked by win rate rather than raw wins", () => {
  const rows = calculateLeaderboard(players.slice(0, 5), [
    match(["A", "B"], ["C", "D"], 6, 4),
    match(["A", "C"], ["B", "D"], 6, 4),
    match(["E", "B"], ["C", "D"], 6, 4),
    match(["E", "D"], ["A", "C"], 6, 4),
  ]);
  assert.equal(rows[0].id, "E");
  assert.equal(rows[0].matchesPlayed, 2);
  assert.equal(rows[0].winPercent, 100);
  assert.equal(rows.find((row) => row.id === "A").wins, 2);
  assert.equal(rows.find((row) => row.id === "A").matchesPlayed, 3);
});

test("fixed partners appear once per pair and never as individual standings rows", () => {
  const fixedPairs = [{ firstId: "B", secondId: "A" }, { firstId: "C", secondId: "D" }, { firstId: "E", secondId: "F" }];
  const rows = calculateLeaderboard(players, [
    match(["A", "B"], ["C", "D"], 6, 4),
    match(["F", "E"], ["B", "A"], 6, 4),
    match(["C", "D"], ["E", "F"], 6, 5),
  ], "FIXED", fixedPairs);
  assert.equal(rows.length, 3);
  assert.ok(rows.every((row) => row.name.includes(" + ")));
  assert.ok(rows.every((row) => row.matchesPlayed === 2));
  assert.equal(rows.find((row) => row.id === "A:B").name, "Budi + Andi");
  assert.equal(rows.find((row) => row.id === "A:B").wins, 1);
  assert.equal(rows.find((row) => row.id === "E:F").difference, 1);
  assert.equal(rows[0].id, "E:F");
  assert.ok(!rows.some((row) => row.id === "A" || row.id === "B"));
});

test("score corrections change standings on the next calculation", () => {
  const before = calculateLeaderboard(players.slice(0, 4), [match(["A", "B"], ["C", "D"], 6, 4)]);
  const after = calculateLeaderboard(players.slice(0, 4), [match(["A", "B"], ["C", "D"], 4, 6)]);
  assert.deepEqual(before.slice(0, 2).map((row) => row.id), ["A", "B"]);
  assert.deepEqual(after.slice(0, 2).map((row) => row.id), ["C", "D"]);
});

test("tennis standings use the recorded winner even when shortened game totals are tied", () => {
  const rows = calculateLeaderboard(players.slice(0, 2), [
    { ...match(["A"], ["B"], 3, 3), winner: "A" },
  ]);
  assert.equal(rows.find((row) => row.id === "A").wins, 1);
  assert.equal(rows.find((row) => row.id === "B").losses, 1);
  assert.equal(rows.find((row) => row.id === "A").difference, 0);
});

test("Player Stats alone ranks by Net Score and Efficiency, ignoring FE", () => {
  const stats = calculatePlayerStats(players.slice(0, 4), [
    ...counts("A", 15, 2, 1, 0), ...counts("B", 10, 400, 4, 2),
    ...counts("C", 12, 5, 14, 1),
  ]);
  const rows = calculatePlayerRanking(stats, []);
  const byId = new Map(rows.map((row) => [row.id, row]));
  assert.deepEqual([byId.get("A").netScore, byId.get("B").netScore, byId.get("C").netScore], [14, 4, -3]);
  assert.deepEqual([byId.get("A").efficiency.toFixed(1), byId.get("B").efficiency.toFixed(1)], ["93.8", "62.5"]);
  assert.equal(byId.get("D").efficiency, null);
  assert.deepEqual(rows.map((row) => row.id), ["A", "B", "D", "C"]);
});

test("resetting results leaves zeroed random and fixed standings", () => {
  const random = calculateLeaderboard(players.slice(0, 4), []);
  const fixed = calculateLeaderboard(players.slice(0, 4), [], "FIXED", [{ firstId: "A", secondId: "B" }, { firstId: "C", secondId: "D" }]);
  assert.equal(random.length, 4);
  assert.equal(fixed.length, 2);
  assert.ok([...random, ...fixed].every((row) => row.wins === 0 && row.losses === 0 && row.difference === 0));
});

test("score and event handlers do not import ranking; only the results page loads it", async () => {
  const [actions, page, service, tabs, view] = await Promise.all([
    readFile(new URL("../features/matches/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/sessions/[id]/leaderboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/leaderboard/service.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/session-tabs.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/leaderboard/results-view.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(actions, /calculate(?:Session|Player)?(?:Leaderboard|Ranking)|calculatePlayerStats|features\/leaderboard/);
  assert.match(page, /calculateSessionLeaderboard\(session\)/);
  assert.match(service, /matchEvent\.groupBy/);
  assert.match(service, /status: "FINISHED"/);
  assert.match(tabs, /prefetch=\{false\}/);
  assert.match(view, /router\.refresh\(\)/);
});
