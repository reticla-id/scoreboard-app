export const MATCH_FORMATS = ["SINGLES", "DOUBLES"] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

export function readMatchFormat(value: unknown): MatchFormat {
  if (value === "SINGLES" || value === "DOUBLES") return value;
  throw new Error("Unsupported match format.");
}

export function matchFormatName(format: MatchFormat) {
  return format === "SINGLES" ? "Singles" : "Doubles";
}
