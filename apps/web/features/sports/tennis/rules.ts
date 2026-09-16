import { calculateLeaderboard, calculatePlayerRanking } from "../../leaderboard/calculate.ts";
import { calculatePlayerStats } from "../../leaderboard/player-stats.ts";
import { generateTennisMatches, tennisMinimumPlayers, tennisRoundAvailability } from "./generator.ts";
import { STANDARD_TENNIS_SCORING, calculateTennisScore } from "./scoring.ts";

export const tennisRules = {
  code: "TENNIS",
  minimumPlayers: 2,
  matchFormats: ["SINGLES", "DOUBLES"],
  eventTypes: [],
  eventGlossary: [],
  tennisMinimumPlayers,
  tennisRoundAvailability,
  generateTennisMatches,
  scoring: STANDARD_TENNIS_SCORING,
  calculateTennisScore,
  calculateLeaderboard,
  calculatePlayerRanking,
  calculatePlayerStats,
} as const;
