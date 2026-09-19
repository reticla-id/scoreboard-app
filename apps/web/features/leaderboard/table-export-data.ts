import type { LeaderboardRow, PlayerRankingRow } from "./calculate";
import type { PartnerMode } from "@/features/sports/padel/partner-modes";

export type ExportTable = {
  type: "leaderboard" | "stats";
  filename: string;
  headers: readonly string[];
  rows: string[][];
  mobileRows: { rank: string; name: string; primary: string; secondary: string; secondaryLabel?: string; detailLabel: string; detailValue: string }[];
};
export type TableExportInput = { type: "leaderboard"; rows: readonly LeaderboardRow[]; partnerMode: PartnerMode; sport: string } | { type: "stats"; rows: readonly PlayerRankingRow[] };

function signed(value: number) { return value > 0 ? `+${value}` : String(value); }

/** Uses the already-calculated rows and their current order; no ranking happens here. */
export function tableExportData(input: TableExportInput): ExportTable {
  if (input.type === "leaderboard") return {
    type: "leaderboard",
    filename: "reticla-leaderboard.png",
    headers: ["RANK", input.partnerMode === "FIXED" ? "PARTNERS" : "PLAYER", "W", "L", ...(input.sport === "PADEL" ? ["TOTAL SCORE"] : []), "DIFF", "WIN %"],
    rows: input.rows.map((row, index) => [index === 0 ? "#1" : String(index + 1).padStart(2, "0"), row.name, String(row.wins), String(row.losses), ...(input.sport === "PADEL" ? [String(row.gamesWon)] : []), signed(row.difference), `${row.winPercent.toFixed(1)}%`]),
    mobileRows: input.rows.map((row, index) => ({ rank: index === 0 ? "#1" : String(index + 1).padStart(2, "0"), name: row.name, primary: `${row.winPercent.toFixed(1)}%`, secondary: `${row.wins} W · ${row.losses} L`, detailLabel: input.sport === "PADEL" ? "TOTAL SCORE / DIFF" : "DIFF / PLAYED", detailValue: input.sport === "PADEL" ? `${row.gamesWon} / ${signed(row.difference)}` : `${signed(row.difference)} / ${row.matchesPlayed}` })),
  };
  return {
    type: "stats",
    filename: "reticla-player-stats.png",
    headers: ["RANK", "PLAYER", "NET SCORE", "EFFICIENCY", "W / FE / UE / DF"],
    rows: input.rows.map((row, index) => [index === 0 ? "#1" : String(index + 1).padStart(2, "0"), row.name, signed(row.netScore), row.efficiency === null ? "—" : `${row.efficiency.toFixed(1)}%`, `${row.winners} / ${row.forcedErrors} / ${row.unforcedErrors} / ${row.doubleFaults}`]),
    mobileRows: input.rows.map((row, index) => ({ rank: index === 0 ? "#1" : String(index + 1).padStart(2, "0"), name: row.name, primary: signed(row.netScore), secondary: row.efficiency === null ? "—" : `${row.efficiency.toFixed(1)}%`, secondaryLabel: "efficiency", detailLabel: "W / FE / UE / DF", detailValue: `${row.winners} / ${row.forcedErrors} / ${row.unforcedErrors} / ${row.doubleFaults}` })),
  };
}
