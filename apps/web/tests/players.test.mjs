import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readSheet } from "read-excel-file/node";
import { meaningfulRows, parseCsv, parseText } from "../features/players/import-parser.ts";
import { playerNameSchema, validateImportNames } from "../features/players/validation.ts";

test("text import trims empty rows and optional header", () => {
  assert.deepEqual(parseText("Name\nAndi\n\nBudi\r\n"), [{ line: 2, cells: ["Andi"] }, { line: 4, cells: ["Budi"] }]);
});

test("CSV handles quoted names and rejects malformed quoting", () => {
  assert.deepEqual(parseCsv('Name\r\n"Ana, Maria"\r\nBudi\r\n'), [{ line: 2, cells: ["Ana, Maria"] }, { line: 3, cells: ["Budi"] }]);
  assert.throws(() => parseCsv('"Unclosed'), /unclosed/i);
  assert.throws(() => parseCsv('"Andi" extra'), /quoting/i);
});

test("XLSX first sheet yields the expected roster", async () => {
  const fixture = fileURLToPath(new URL("./fixtures/players.xlsx", import.meta.url));
  const rows = meaningfulRows((await readSheet(fixture)).map((cells, index) => ({ line: index + 1, cells })));
  assert.deepEqual(rows.map((row) => row.cells[0]), ["Andi", "Budi"]);
});

test("name validation rejects invalid and duplicate imports", () => {
  assert.equal(playerNameSchema.parse("  Andi   Putra "), "Andi Putra");
  assert.equal(playerNameSchema.safeParse("\u0000Andi").success, false);
  assert.equal(validateImportNames(["Andi", " andi "]).error?.startsWith("Duplicate"), true);
  assert.equal(validateImportNames(["Andi", 25]).error, "Invalid input: expected string, received number");
  assert.deepEqual(validateImportNames(["Andi", "Budi"]).names, ["Andi", "Budi"]);
});

test("large imports are stopped with a clear error", () => {
  assert.throws(() => parseText(Array.from({ length: 501 }, (_, i) => `Player ${i}`).join("\n")), /500/);
  assert.match(validateImportNames(Array(501).fill("Andi")).error, /500/);
});
