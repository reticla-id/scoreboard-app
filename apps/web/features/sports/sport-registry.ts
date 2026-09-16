import { isAvailableSport, sportName } from "./catalog.ts";
import { padelRules } from "./padel/rules.ts";
import { tennisRules } from "./tennis/rules.ts";

const rulesBySport = {
  PADEL: padelRules,
  TENNIS: tennisRules,
} as const;

export type SportRules = (typeof rulesBySport)[keyof typeof rulesBySport];

export function resolveSportRules(code: string): SportRules {
  if (!isAvailableSport(code)) throw new Error(`Unsupported sport: ${code}`);
  return rulesBySport[code];
}

export function resolveSport(code: string) {
  return { code, name: sportName(code), rules: resolveSportRules(code) };
}
