export type TennisSide = "A" | "B";
export type TennisPointHistory = { points: TennisSide[]; manualWinner?: TennisSide };
export type TennisSetScore = { gamesA: number; gamesB: number };
export type TennisScore = {
  history: TennisPointHistory;
  sets: TennisSetScore[];
  setsA: number;
  setsB: number;
  gamesA: number;
  gamesB: number;
  currentPointsA: number;
  currentPointsB: number;
  pointA: string;
  pointB: string;
  phase: "REGULAR" | "DEUCE" | "ADVANTAGE" | "TIEBREAK" | "FINISHED";
  winner: TennisSide | null;
};

export type TennisScoringConfig = {
  gamesToWinSet: number;
  setMargin: number;
  tiebreakAt: number;
  tiebreakPoints: number;
  tiebreakMargin: number;
  setsToWinMatch: number;
};

export const STANDARD_TENNIS_SCORING: TennisScoringConfig = {
  gamesToWinSet: 6,
  setMargin: 2,
  tiebreakAt: 6,
  tiebreakPoints: 7,
  tiebreakMargin: 2,
  setsToWinMatch: 2,
};

const POINT_LABELS = ["0", "15", "30", "40"] as const;

export function readTennisPointHistory(value: unknown): TennisPointHistory {
  if (!value || typeof value !== "object" || !Array.isArray((value as { points?: unknown }).points)) return { points: [] };
  const points = (value as { points: unknown[] }).points;
  if (points.length > 10_000 || points.some((point) => point !== "A" && point !== "B")) throw new Error("Invalid tennis score history.");
  const manualWinner = (value as { manualWinner?: unknown }).manualWinner;
  if (manualWinner !== undefined && manualWinner !== "A" && manualWinner !== "B") throw new Error("Invalid tennis match winner.");
  return { points: points as TennisSide[], ...(manualWinner ? { manualWinner } : {}) };
}

export function calculateTennisScore(history: TennisPointHistory, config: TennisScoringConfig = STANDARD_TENNIS_SCORING): TennisScore {
  let gamesA = 0, gamesB = 0, pointsA = 0, pointsB = 0, setsA = 0, setsB = 0;
  let tiebreak = false;
  let winner: TennisSide | null = null;
  const completed: TennisSetScore[] = [];

  function winSet(side: TennisSide, finalA = gamesA, finalB = gamesB) {
    completed.push({ gamesA: finalA, gamesB: finalB });
    if (side === "A") setsA++; else setsB++;
    gamesA = 0; gamesB = 0; pointsA = 0; pointsB = 0; tiebreak = false;
    if (setsA === config.setsToWinMatch || setsB === config.setsToWinMatch) winner = side;
  }

  function winGame(side: TennisSide) {
    if (side === "A") gamesA++; else gamesB++;
    pointsA = 0; pointsB = 0;
    if ((gamesA >= config.gamesToWinSet || gamesB >= config.gamesToWinSet) && Math.abs(gamesA - gamesB) >= config.setMargin) {
      winSet(gamesA > gamesB ? "A" : "B");
    } else if (gamesA === config.tiebreakAt && gamesB === config.tiebreakAt) {
      tiebreak = true;
    }
  }

  for (const side of history.points) {
    if (winner) break;
    if (side === "A") pointsA++; else pointsB++;
    if (tiebreak) {
      if ((pointsA >= config.tiebreakPoints || pointsB >= config.tiebreakPoints) && Math.abs(pointsA - pointsB) >= config.tiebreakMargin) {
        const winningSide = pointsA > pointsB ? "A" : "B";
        winSet(winningSide, winningSide === "A" ? config.tiebreakAt + 1 : config.tiebreakAt, winningSide === "B" ? config.tiebreakAt + 1 : config.tiebreakAt);
      }
    } else if ((pointsA >= 4 || pointsB >= 4) && Math.abs(pointsA - pointsB) >= 2) {
      winGame(pointsA > pointsB ? "A" : "B");
    }
  }

  const naturallyFinished = winner !== null;
  if (!winner && history.manualWinner) winner = history.manualWinner;
  let phase: TennisScore["phase"] = winner ? "FINISHED" : tiebreak ? "TIEBREAK" : "REGULAR";
  let pointA = tiebreak ? String(pointsA) : POINT_LABELS[Math.min(pointsA, 3)];
  let pointB = tiebreak ? String(pointsB) : POINT_LABELS[Math.min(pointsB, 3)];
  if (!winner && !tiebreak && pointsA >= 3 && pointsB >= 3) {
    if (pointsA === pointsB) { phase = "DEUCE"; pointA = "40"; pointB = "40"; }
    else { phase = "ADVANTAGE"; pointA = pointsA > pointsB ? "AD" : "40"; pointB = pointsB > pointsA ? "AD" : "40"; }
  }
  const sets = naturallyFinished ? completed : [...completed, { gamesA, gamesB }];
  return { history, sets, setsA, setsB, gamesA, gamesB, currentPointsA: pointsA, currentPointsB: pointsB, pointA, pointB, phase, winner };
}

export function addTennisPoint(history: TennisPointHistory, side: TennisSide) {
  return { points: [...history.points, side] } satisfies TennisPointHistory;
}

export function undoTennisPoint(history: TennisPointHistory) {
  return { points: history.points.slice(0, -1) } satisfies TennisPointHistory;
}

export function finishTennisScore(history: TennisPointHistory, winner: TennisSide) {
  if (history.points.length === 0) throw new Error("Record at least one point before finishing the match.");
  return { points: [...history.points], manualWinner: winner } satisfies TennisPointHistory;
}

export function tennisGameTotals(score: TennisScore) {
  return score.sets.reduce((totals, set) => ({
    gamesA: totals.gamesA + set.gamesA,
    gamesB: totals.gamesB + set.gamesB,
  }), { gamesA: 0, gamesB: 0 });
}

export function leadingTennisSide(score: TennisScore): TennisSide | null {
  if (score.setsA !== score.setsB) return score.setsA > score.setsB ? "A" : "B";
  if (score.gamesA !== score.gamesB) return score.gamesA > score.gamesB ? "A" : "B";
  if (score.currentPointsA !== score.currentPointsB) return score.currentPointsA > score.currentPointsB ? "A" : "B";
  return null;
}
