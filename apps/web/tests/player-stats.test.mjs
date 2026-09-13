import assert from "node:assert/strict";
import test from "node:test";
import { calculatePlayerStats } from "../features/leaderboard/player-stats.ts";

const players = [
  { id: "a", name: "Andi" },
  { id: "b", name: "Budi" },
  { id: "c", name: "Charlie", removedAt: new Date() },
  { id: "d", name: "Dimas", removedAt: new Date() },
];

test("session player stats derive only the four recorded outcomes", () => {
  const rows = calculatePlayerStats(players, [
    { playerId: "a", type: "W", count: 12 },
    { playerId: "a", type: "FE", count: 4 },
    { playerId: "a", type: "UE", count: 3 },
    { playerId: "a", type: "DF", count: 1 },
    { playerId: "c", type: "W", count: 2 },
    { playerId: "a", type: "UNKNOWN", count: 99 },
    { playerId: "other-session-player", type: "W", count: 100 },
  ]);
  assert.deepEqual(rows.find((row) => row.id === "a"), { id: "a", name: "Andi", winners: 12, forcedErrors: 4, unforcedErrors: 3, doubleFaults: 1 });
  assert.equal(rows.find((row) => row.id === "b").winners, 0);
  assert.equal(rows.find((row) => row.id === "c").winners, 2);
  assert.ok(!rows.some((row) => row.id === "d"));
  assert.ok(!rows.some((row) => row.id === "other-session-player"));
});

test("clearing match events returns active players to zero stats", () => {
  const rows = calculatePlayerStats(players, []);
  assert.deepEqual(rows.map((row) => row.id), ["a", "b"]);
  assert.ok(rows.every((row) => row.winners + row.forcedErrors + row.unforcedErrors + row.doubleFaults === 0));
});

test("a removed player remains in session results when a finished match includes them", () => {
  const rows = calculatePlayerStats(players, [], new Set(["d"]));
  assert.ok(rows.some((row) => row.id === "d"));
  assert.ok(!rows.some((row) => row.id === "c"));
});
