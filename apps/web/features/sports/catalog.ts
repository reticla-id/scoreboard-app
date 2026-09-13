export const SPORT_OPTIONS = [
  { code: "PADEL", name: "Padel", icon: "◉", available: true },
  { code: "TENNIS", name: "Tennis", icon: "◌", available: false },
  { code: "BASKETBALL", name: "Basketball", icon: "◎", available: false },
  { code: "FUTSAL", name: "Futsal", icon: "⬡", available: false },
  { code: "BADMINTON", name: "Badminton", icon: "◇", available: false },
] as const;

export type SportCode = (typeof SPORT_OPTIONS)[number]["code"];
export type AvailableSportCode = Extract<(typeof SPORT_OPTIONS)[number], { available: true }>["code"];

export function isAvailableSport(value: unknown): value is AvailableSportCode {
  return typeof value === "string" && SPORT_OPTIONS.some((sport) => sport.code === value && sport.available);
}

export function sportName(code: string): string {
  return SPORT_OPTIONS.find((sport) => sport.code === code)?.name ?? code;
}
