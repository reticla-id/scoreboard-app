import { generateRoundMatches, plannedRoundMatchCount } from "../../matches/generator.ts";
import { EVENT_TYPES, pointWinningSide } from "../../matches/scoring.ts";
import { EVENT_GLOSSARY } from "../../matches/event-glossary.ts";
import { calculateLeaderboard, calculatePlayerRanking } from "../../leaderboard/calculate.ts";
import { calculatePlayerStats } from "../../leaderboard/player-stats.ts";
import { generatePadelMatches, padelRoundAvailability, plannedPadelMatchCount } from "./partner-modes.ts";

/** The single home for Padel's current roster, match, scoring, and results rules. */
export const padelRules = {
  code: "PADEL",
  minimumPlayers: 4,
  generateRoundMatches,
  plannedRoundMatchCount,
  generatePadelMatches,
  padelRoundAvailability,
  plannedPadelMatchCount,
  eventTypes: EVENT_TYPES,
  eventGlossary: EVENT_GLOSSARY,
  pointWinningSide,
  calculateLeaderboard,
  calculatePlayerRanking,
  calculatePlayerStats,
} as const;
