import { MAX_IMPORT_ROWS } from "./validation.ts";

export type ImportRow = { line: number; cells: unknown[] };

export function parseText(text: string): ImportRow[] {
  const rows = text.replace(/^\uFEFF/u, "").split(/\r\n|\n|\r/u).map((name, index) => ({ line: index + 1, cells: [name] }));
  return meaningfulRows(rows);
}

export function parseCsv(text: string): ImportRow[] {
  const input = text.replace(/^\uFEFF/u, "");
  const rows: ImportRow[] = [];
  let cells: string[] = [];
  let cell = "";
  let line = 1;
  let rowLine = 1;
  let quoted = false;
  let afterQuote = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; afterQuote = true; }
      else { cell += char; if (char === "\n") line++; }
    } else if (afterQuote) {
      if (char === ",") { cells.push(cell); cell = ""; afterQuote = false; }
      else if (char === "\n" || char === "\r") { rows.push({ line: rowLine, cells: [...cells, cell] }); cells = []; cell = ""; afterQuote = false; if (char === "\r" && input[i + 1] === "\n") i++; line++; rowLine = line; }
      else throw new Error(`Invalid CSV quoting near row ${rowLine}.`);
    } else if (char === '"') {
      if (cell.length) throw new Error(`Invalid CSV quoting near row ${rowLine}.`);
      quoted = true;
    } else if (char === ",") { cells.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") { rows.push({ line: rowLine, cells: [...cells, cell] }); cells = []; cell = ""; if (char === "\r" && input[i + 1] === "\n") i++; line++; rowLine = line; }
    else cell += char;
  }
  if (quoted) throw new Error("The CSV file has an unclosed quoted value.");
  if (cell.length || cells.length || afterQuote) rows.push({ line: rowLine, cells: [...cells, cell] });
  return meaningfulRows(rows);
}

export function meaningfulRows(rows: ImportRow[]): ImportRow[] {
  const filtered = rows.filter((row) => row.cells.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""));
  if (filtered.length > MAX_IMPORT_ROWS + 1) throw new Error(`Import up to ${MAX_IMPORT_ROWS} players at a time.`);
  if (filtered.length && filtered[0].cells.length === 1 && String(filtered[0].cells[0]).trim().toLowerCase() === "name") filtered.shift();
  if (filtered.length > MAX_IMPORT_ROWS) throw new Error(`Import up to ${MAX_IMPORT_ROWS} players at a time.`);
  return filtered;
}
