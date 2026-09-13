export type TeamSide = "A" | "B";
export type EventType = "W" | "FE" | "UE" | "DF";
export type Score = { a: number; b: number };
export type ScoreOperation = { kind: "change"; side: TeamSide; delta: -1 | 1 } | { kind: "reset" } | { kind: "event"; playerId: string; playerSide: TeamSide; type: EventType };

export const EVENT_TYPES: readonly EventType[] = ["W", "FE", "UE", "DF"];

export function pointWinningSide(playerSide: TeamSide, type: EventType): TeamSide {
  return type === "W" ? playerSide : playerSide === "A" ? "B" : "A";
}

export function changeDisplayedScore(score: Score, side: TeamSide, delta: -1 | 1): Score {
  return side === "A"
    ? { ...score, a: Math.max(0, Math.min(99, score.a + delta)) }
    : { ...score, b: Math.max(0, Math.min(99, score.b + delta)) };
}

export function projectScore(base: Score, operations: readonly ScoreOperation[]): Score {
  return operations.reduce((score, operation) => {
    if (operation.kind === "reset") return { a: 0, b: 0 };
    if (operation.kind === "change") return changeDisplayedScore(score, operation.side, operation.delta);
    return changeDisplayedScore(score, pointWinningSide(operation.playerSide, operation.type), 1);
  }, base);
}
