import assert from "node:assert/strict";
import test from "node:test";
import { addTennisPoint, calculateTennisScore, finishTennisScore, leadingTennisSide, tennisGameTotals, undoTennisPoint } from "../features/sports/tennis/scoring.ts";
import { generateTennisMatches, tennisRoundAvailability } from "../features/sports/tennis/generator.ts";

function points(sequence) { return { points: sequence.split("").filter((side) => side === "A" || side === "B") }; }
function game(side) { return side.repeat(4); }
function set(side) { return game(side).repeat(6); }

test("tennis follows 0, 15, 30, 40, deuce, and advantage", () => {
  assert.equal(calculateTennisScore(points("")).pointA, "0");
  assert.equal(calculateTennisScore(points("A")).pointA, "15");
  assert.equal(calculateTennisScore(points("AA")).pointA, "30");
  assert.equal(calculateTennisScore(points("AAA")).pointA, "40");
  assert.equal(calculateTennisScore(points("AAABBB")).phase, "DEUCE");
  const advantage = calculateTennisScore(points("AAABBBA"));
  assert.equal(advantage.phase, "ADVANTAGE");
  assert.equal(advantage.pointA, "AD");
  assert.equal(calculateTennisScore(points("AAABBBAB")).phase, "DEUCE");
  assert.equal(calculateTennisScore(points("AAABBBAA")).gamesA, 1);
});

test("a set is won at six by two and a 6-6 set uses a seven-point win-by-two tie-break", () => {
  const straight = calculateTennisScore(points(set("A")));
  assert.equal(straight.setsA, 1);
  assert.deepEqual(straight.sets[0], { gamesA: 6, gamesB: 0 });
  const sixAll = Array.from({ length: 6 }, () => game("A") + game("B")).join("");
  const tiebreak = calculateTennisScore(points(sixAll));
  assert.equal(tiebreak.phase, "TIEBREAK");
  assert.equal(tiebreak.pointA, "0");
  const finished = calculateTennisScore(points(sixAll + "AAAAAAA"));
  assert.equal(finished.setsA, 1);
  assert.deepEqual(finished.sets[0], { gamesA: 7, gamesB: 6 });
});

test("best of three ends immediately at two sets and supports a full deciding set", () => {
  const straightSets = calculateTennisScore(points(set("A") + set("A") + "BBBB"));
  assert.equal(straightSets.winner, "A");
  assert.equal(straightSets.setsA, 2);
  assert.equal(straightSets.sets.length, 2);
  const deciding = calculateTennisScore(points(set("A") + set("B") + set("A")));
  assert.equal(deciding.winner, "A");
  assert.deepEqual(deciding.sets.map((score) => [score.gamesA, score.gamesB]), [[6, 0], [0, 6], [6, 0]]);
});

test("tennis point history supports reliable undo", () => {
  const history = addTennisPoint(addTennisPoint({ points: [] }, "A"), "B");
  assert.deepEqual(undoTennisPoint(history), { points: ["A"] });
  assert.deepEqual(undoTennisPoint({ points: [] }), { points: [] });
});

test("tennis can finish a shortened match with an explicit winner", () => {
  const history = points(game("A") + game("B") + game("A") + "BB");
  const score = calculateTennisScore(finishTennisScore(history, "A"));
  assert.equal(score.phase, "FINISHED");
  assert.equal(score.winner, "A");
  assert.deepEqual(score.sets, [{ gamesA: 2, gamesB: 1 }]);
  assert.deepEqual(tennisGameTotals(score), { gamesA: 2, gamesB: 1 });
  assert.throws(() => finishTennisScore({ points: [] }, "A"), /at least one point/i);
});

test("early finish resolves the leader from sets, games, then points", () => {
  assert.equal(leadingTennisSide(calculateTennisScore(points(set("A") + game("B").repeat(2)))), "A");
  assert.equal(leadingTennisSide(calculateTennisScore(points(game("A").repeat(4) + game("B").repeat(2)))), "A");
  assert.equal(leadingTennisSide(calculateTennisScore(points("BB"))), "B");
  assert.equal(leadingTennisSide(calculateTennisScore(points("AB"))), null);
});

test("tennis singles and doubles generation keep valid team sizes", () => {
  const players = Array.from({ length: 4 }, (_, index) => ({ id: String(index), name: `Player ${index}` }));
  const singles = generateTennisMatches("SINGLES", "RANDOM", players, [], 7);
  assert.equal(singles.length, 6);
  assert.ok(singles.every((match) => match.teamA.length === 1 && match.teamB.length === 1 && match.teamA[0].id !== match.teamB[0].id));
  const doubles = generateTennisMatches("DOUBLES", "RANDOM", players, [], 7);
  assert.equal(doubles.length, 3);
  assert.ok(doubles.every((match) => match.teamA.length === 2 && match.teamB.length === 2));
  assert.equal(tennisRoundAvailability("SINGLES", "RANDOM", players.slice(0, 1), []).enabled, false);
  assert.equal(tennisRoundAvailability("DOUBLES", "RANDOM", players.slice(0, 3), []).enabled, false);
});
