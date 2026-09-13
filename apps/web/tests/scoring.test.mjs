import assert from "node:assert/strict";
import test from "node:test";
import { pointWinningSide, projectScore } from "../features/matches/scoring.ts";

test("winner scores for the selected player; each error scores for the opponent", () => {
  for (const side of ["A", "B"]) {
    assert.equal(pointWinningSide(side, "W"), side);
    for (const type of ["FE", "UE", "DF"]) assert.notEqual(pointWinningSide(side, type), side);
  }
});

test("each queued tap changes the score exactly once, even across acknowledgements", () => {
  const taps = [
    { kind: "change", side: "A", delta: 1 },
    { kind: "change", side: "A", delta: 1 },
    { kind: "change", side: "A", delta: -1 },
    { kind: "event", playerId: "B", playerSide: "B", type: "FE" },
    { kind: "event", playerId: "B", playerSide: "B", type: "W" },
  ];
  assert.deepEqual(projectScore({ a: 0, b: 0 }, taps), { a: 2, b: 1 });
  assert.deepEqual(projectScore({ a: 1, b: 0 }, taps.slice(1)), { a: 2, b: 1 });
  assert.deepEqual(projectScore({ a: 2, b: 0 }, taps.slice(2)), { a: 2, b: 1 });
  assert.deepEqual(projectScore({ a: 0, b: 0 }, [{ kind: "change", side: "A", delta: 1 }, { kind: "reset" }, { kind: "change", side: "B", delta: 1 }]), { a: 0, b: 1 });
});

test("score controls clamp at the persisted score limits", () => {
  assert.deepEqual(projectScore({ a: 0, b: 99 }, [{ kind: "change", side: "A", delta: -1 }, { kind: "change", side: "B", delta: 1 }]), { a: 0, b: 99 });
});
