"use client";

import { useId, useRef, useState } from "react";
import { useDismissiblePopover } from "@/hooks/use-dismissible-popover";
import { tableExportData, type TableExportInput } from "./table-export-data";

export function TableExportActions(input: TableExportInput) {
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const asset = useRef<{ signature: string; blob: Blob } | null>(null);
  const running = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"copy" | "download" | null>(null);
  const [message, setMessage] = useState("");
  useDismissiblePopover(open, root, () => setOpen(false));

  async function run(action: "copy" | "download") {
    if (running.current) return;
    running.current = true;
    setOpen(false);
    setBusy(action);
    setMessage("");
    try {
      const table = tableExportData(input);
      const image = await import("./table-image-export");
      const view = image.visibleExportLayout(root.current);
      const signature = JSON.stringify({ table, view });
      const blob = asset.current?.signature === signature ? asset.current.blob : await image.renderTransparentTablePng(table, view.layout, view.width);
      asset.current = { signature, blob };
      if (action === "copy") {
        const copied = await image.copyPng(blob);
        setMessage(copied ? "Image copied." : "Could not copy this image. Download PNG is available.");
      } else {
        image.downloadPng(blob, table.filename);
        setMessage("PNG download started.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the PNG. Try again.");
    } finally { running.current = false; setBusy(null); }
  }

  return <div ref={root} className="table-export">
    <button className="table-share-trigger" type="button" aria-expanded={open} aria-controls={menuId} disabled={busy !== null} onClick={() => setOpen((value) => !value)}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m0 0L7 8m5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
      {busy ? "Preparing image…" : "Share"}
    </button>
    {open && <div id={menuId} className="table-share-menu" aria-label="Share table image"><button type="button" onClick={() => run("copy")}>Copy as Image</button><button type="button" onClick={() => run("download")}>Download PNG</button></div>}
    {message && <p className="table-export-message" role="status">{message}</p>}
  </div>;
}
