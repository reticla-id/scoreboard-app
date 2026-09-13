import { z } from "zod";

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_FILE_BYTES = 1024 * 1024;

export function cleanPlayerName(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function playerNameKey(value: string) {
  return cleanPlayerName(value).toLocaleLowerCase();
}

export const playerNameSchema = z.string().transform(cleanPlayerName).pipe(
  z.string().min(1, "Enter a player name.").max(80, "Names must be 80 characters or less.").refine(
    (name) => !/[\p{Cc}\p{Cf}]/u.test(name),
    "Names cannot contain control characters.",
  ),
);

export const playerIdSchema = z.uuid();

export function validateImportNames(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_IMPORT_ROWS) {
    return { error: `Select 1 to ${MAX_IMPORT_ROWS} players.` } as const;
  }
  const names: string[] = [];
  const seen = new Set<string>();
  for (const valueName of value) {
    const parsed = playerNameSchema.safeParse(valueName);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid player name." } as const;
    const key = playerNameKey(parsed.data);
    if (seen.has(key)) return { error: `Duplicate name in import: ${parsed.data}.` } as const;
    seen.add(key);
    names.push(parsed.data);
  }
  return { names } as const;
}
