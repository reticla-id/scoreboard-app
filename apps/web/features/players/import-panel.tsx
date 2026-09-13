"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { importPlayers } from "./actions";
import { meaningfulRows, parseCsv, parseText, type ImportRow } from "./import-parser";
import { MAX_IMPORT_FILE_BYTES, playerNameKey, playerNameSchema } from "./validation";
import type { RosterPlayer } from "./roster";
import { ArrowUpRightIcon } from "@/components/action-icons";

type PreviewRow = { line: number; name: string; error?: string; selected: boolean };

function buildPreview(raw: ImportRow[], existing: RosterPlayer[]): PreviewRow[] {
  const names = new Set(existing.map((player) => playerNameKey(player.name)));
  const rowsSeen = new Set<string>();
  return raw.map(({ line, cells }) => {
    const nonempty = cells.filter((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
    const name = nonempty.length === 1 ? String(nonempty[0]) : cells.map((cell) => cell == null ? "" : String(cell)).join(" | ");
    if (nonempty.length !== 1) return { line, name, error: "Expected one name column.", selected: false };
    if (typeof nonempty[0] !== "string") return { line, name, error: "Name must be text.", selected: false };
    const parsed = playerNameSchema.safeParse(name);
    if (!parsed.success) return { line, name, error: parsed.error.issues[0]?.message ?? "Invalid name.", selected: false };
    const key = playerNameKey(parsed.data);
    if (names.has(key)) return { line, name: parsed.data, error: "Already in this session.", selected: false };
    if (rowsSeen.has(key)) return { line, name: parsed.data, error: "Duplicate in this import.", selected: false };
    rowsSeen.add(key);
    return { line, name: parsed.data, selected: true };
  });
}

function ImportButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return <button className="button" type="submit" disabled={pending || count === 0}>{pending ? "Importing…" : <>Import {count} player{count === 1 ? "" : "s"} <ArrowUpRightIcon /></>}</button>;
}

export function ImportPanel({ sessionId, players }: { sessionId: string; players: RosterPlayer[] }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [source, setSource] = useState("");
  const [parseError, setParseError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sourceMode, setSourceMode] = useState<"choose" | "text" | "csv" | "xlsx">("choose");
  const [state, action] = useActionState(async (previous: { error?: string; success?: string }, formData: FormData) => {
    const result = await importPlayers(sessionId, previous, formData);
    if (result.success) { setRows([]); setText(""); setSource(""); }
    return result;
  }, {});
  const selected = rows.filter((row) => row.selected && !row.error);
  const issues = rows.filter((row) => row.error).length;

  function preview(raw: ImportRow[], label: string) {
    if (!raw.length) throw new Error("No player names found. Add one name per row.");
    setRows(buildPreview(raw, players));
    setSource(label);
    setParseError("");
  }

  async function handleFile(file?: File) {
    if (!file) return;
    setRows([]); setParseError(""); setBusy(true);
    try {
      if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error("File is too large. Import a file under 1 MB and 500 players at a time.");
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== sourceMode) throw new Error(`Choose a ${sourceMode.toUpperCase()} file.`);
      if (extension === "csv") preview(parseCsv(await file.text()), file.name);
      else if (extension === "xlsx") {
        const { readSheet } = await import("read-excel-file/browser");
        const sheet = await readSheet(file);
        preview(meaningfulRows(sheet.map((cells, index) => ({ line: index + 1, cells }))), file.name);
      } else throw new Error("Choose a CSV or XLSX file.");
    } catch (error) { setParseError(error instanceof Error ? error.message : "Could not read this file."); }
    finally { setBusy(false); }
  }

  function handleText() {
    try { preview(parseText(text), "Pasted text"); }
    catch (error) { setRows([]); setParseError(error instanceof Error ? error.message : "Could not read this list."); }
  }

  return <section className="import-panel" id="import-players" aria-labelledby="import-heading">
    <h4 className="sr-only" id="import-heading">Import players</h4>
    {sourceMode === "choose" ? <div className="import-source-choices"><button className="button button-secondary" type="button" onClick={() => setSourceMode("text")}>Text</button><button className="button button-secondary" type="button" onClick={() => setSourceMode("csv")}>CSV</button><button className="button button-secondary" type="button" onClick={() => setSourceMode("xlsx")}>XLSX</button></div> : <div className="import-input-grid">
      {sourceMode === "text" ? <div className="session-form-field"><label htmlFor="player-import-text">One name per line</label><textarea id="player-import-text" value={text} onChange={(event) => setText(event.target.value)} placeholder={"Andi\nBudi\nCharlie\nDimas"} rows={6} maxLength={50000} autoFocus /><div className="import-source-actions"><button type="button" className="button button-small" onClick={handleText} disabled={!text.trim()}>Preview names</button><button className="text-link" type="button" onClick={() => setSourceMode("choose")}>Change method</button></div><p className="field-note">Blank lines are ignored.</p></div> : <div className="session-form-field"><label htmlFor="player-import-file">One-column {sourceMode.toUpperCase()} file</label><input key={sourceMode} id="player-import-file" type="file" accept={sourceMode === "csv" ? ".csv,text/csv" : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"} onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ""; }} /><div className="import-source-actions"><button className="text-link" type="button" onClick={() => setSourceMode("choose")}>Change method</button></div><p className="field-note">Optional “Name” header · 1 MB · 500 rows · first sheet</p></div>}
    </div>}
    {busy && <p className="muted" role="status">Reading file…</p>}
    {parseError && <p className="message error" role="alert">{parseError}</p>}
    {rows.length > 0 && <div className="import-preview"><div className="import-preview-head"><div><span className="panel-index">PREVIEW / {source}</span><h3>{selected.length} READY · {issues} NEED REVIEW</h3></div><button className="text-link" type="button" onClick={() => { setRows([]); setSource(""); }}>Clear preview</button></div>
      <p className="field-note">Invalid and duplicate rows are excluded. Uncheck any player you don’t want to add.</p>
      <div className="import-preview-list" role="list">{rows.map((row, index) => <label key={`${row.line}-${index}`} className={`import-preview-row ${row.error ? "import-invalid" : ""}`} role="listitem"><input type="checkbox" checked={row.selected} disabled={!!row.error} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, selected: event.target.checked } : item))} /><span className="import-line">{String(row.line).padStart(3, "0")}</span><span className="import-name">{row.name || "Empty name"}</span><span className="import-status">{row.error ?? (row.selected ? "Ready" : "Excluded")}</span></label>)}</div>
      <form action={action} className="import-confirm"><input type="hidden" name="names" value={JSON.stringify(selected.map((row) => row.name))} /><ImportButton count={selected.length} /></form>
    </div>}
    {state.error && <p className="message error" role="alert">{state.error}</p>}
    {state.success && <p className="message success" role="status">{state.success}</p>}
  </section>;
}
