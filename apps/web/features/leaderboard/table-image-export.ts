import type { ExportTable } from "./table-export-data";

export type ExportLayout = "mobile" | "desktop";

/** Follow the rendered breakpoint, including browser zoom and future CSS changes. */
export function visibleExportLayout(container: HTMLElement | null): { layout: ExportLayout; width?: number } {
  const mobileList = container?.parentElement?.querySelector<HTMLElement>(".rankings-mobile");
  if (mobileList && getComputedStyle(mobileList).display !== "none") {
    return { layout: "mobile", width: Math.round(mobileList.getBoundingClientRect().width) };
  }
  return { layout: "desktop" };
}

const colors = {
  foreground: "#ffffff",
  secondary: "#a0a0a0",
  border: "#2a2a2a",
  orange: "#f47b20",
  black: "#000000",
} as const;

function wrapName(context: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/)) {
    if (!word) continue;
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) { line = candidate; continue; }
    if (line) { lines.push(line); line = ""; }
    for (const character of word) {
      if (line && context.measureText(line + character).width > maxWidth) { lines.push(line); line = ""; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("This browser could not encode the PNG image.")), "image/png");
  });
}

function renderMobileTable(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, table: ExportTable, requestedWidth?: number): Promise<Blob> {
  // The on-screen list is the source for this width. Keep only a narrow ink margin.
  const width = Math.max(240, Math.round(requestedWidth || 390));
  const inset = 4;
  const rankWidth = 38;
  const gap = 10;
  const nameX = inset + 10 + rankWidth + gap;
  const right = width - inset;
  const metrics = table.mobileRows.map((row) => {
    context.font = '400 30px "Bebas Neue"';
    const primaryWidth = context.measureText(row.primary).width;
    context.font = '700 13px "Inter"';
    const secondaryWidth = context.measureText(row.secondary).width;
    context.font = '400 10px "Inter"';
    const labelWidth = row.secondaryLabel ? context.measureText(` ${row.secondaryLabel}`).width : 0;
    const metricWidth = Math.max(primaryWidth, secondaryWidth + labelWidth);
    context.font = '700 15px "Inter"';
    const nameLines = wrapName(context, row.name, Math.max(48, right - nameX - metricWidth - gap));
    context.font = '700 12px "Inter"';
    const detailValueWidth = context.measureText(row.detailValue).width;
    const detailLines = wrapName(context, row.detailValue, right - nameX);
    context.font = '700 10px "Inter"';
    const detailLabelWidth = context.measureText(row.detailLabel).width;
    const detailWraps = detailLabelWidth + detailValueWidth + 12 > right - nameX;
    const height = Math.max(112, 14 + Math.max(nameLines.length * 19, 40) + 3 + (detailWraps ? 17 + detailLines.length * 16 : 17) + 15);
    return { nameLines, detailLines, detailWraps, height };
  });
  const height = 8 + metrics.reduce((sum, row) => sum + row.height, 0);
  const scale = width * height < 10_000_000 && height < 8000 ? 2 : 1;
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  if (!canvas.width || !canvas.height) throw new Error("This browser cannot create an image for this table size.");
  context.scale(scale, scale);
  context.clearRect(0, 0, width, height);
  context.textBaseline = "top";
  let y = 4;
  table.mobileRows.forEach((row, index) => {
    const metric = metrics[index];
    const top = y + 14;
    const rankX = inset + (index === 0 ? 10 : 0);
    if (index === 0) {
      context.fillStyle = colors.orange;
      context.fillRect(inset, y + 7, 3, metric.height - 14);
      context.fillRect(rankX, top, 32, 32);
      context.fillStyle = colors.black;
      context.font = '400 23px "Bebas Neue"';
      context.textAlign = "center";
      context.fillText(row.rank, rankX + 16, top + 4);
    } else {
      context.fillStyle = colors.orange;
      context.font = '400 27px "Bebas Neue"';
      context.textAlign = "left";
      context.fillText(row.rank, rankX, top);
    }
    context.fillStyle = colors.foreground;
    context.font = '700 15px "Inter"';
    context.textAlign = "left";
    metric.nameLines.forEach((line, lineIndex) => context.fillText(line, nameX, top + lineIndex * 19));
    context.fillStyle = colors.orange;
    context.font = '400 30px "Bebas Neue"';
    context.textAlign = "right";
    context.fillText(row.primary, right, top - 3);
    context.font = '400 10px "Inter"';
    const secondaryLabelWidth = row.secondaryLabel ? context.measureText(` ${row.secondaryLabel}`).width : 0;
    context.fillStyle = colors.foreground;
    context.font = '700 13px "Inter"';
    context.fillText(row.secondary, right - secondaryLabelWidth, top + 30);
    if (row.secondaryLabel) {
      context.fillStyle = colors.secondary;
      context.font = '400 10px "Inter"';
      context.fillText(row.secondaryLabel, right, top + 33);
    }
    const detailY = y + metric.height - (metric.detailWraps ? 15 + metric.detailLines.length * 16 + 15 : 30);
    context.fillStyle = colors.secondary;
    context.font = '700 10px "Inter"';
    context.textAlign = "left";
    context.fillText(row.detailLabel, nameX, detailY);
    context.fillStyle = colors.foreground;
    context.font = '700 12px "Inter"';
    context.textAlign = "right";
    if (metric.detailWraps) metric.detailLines.forEach((line, lineIndex) => context.fillText(line, right, detailY + 17 + lineIndex * 16));
    else context.fillText(row.detailValue, right, detailY);
    y += metric.height;
    context.beginPath();
    context.strokeStyle = colors.border;
    context.lineWidth = 1;
    context.moveTo(inset, y + .5);
    context.lineTo(right, y + .5);
    context.stroke();
  });
  return encodePng(canvas);
}

/** Draws only table ink onto a transparent canvas; never reads page pixels. */
export async function renderTransparentTablePng(table: ExportTable, layout: ExportLayout = "desktop", mobileWidth?: number): Promise<Blob> {
  if (!document.fonts) throw new Error("This browser cannot load the export fonts.");
  await Promise.all([
    document.fonts.load('700 16px "Inter"'),
    document.fonts.load('400 27px "Bebas Neue"'),
  ]);
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  const rawContext = canvas.getContext("2d");
  if (!rawContext) throw new Error("This browser cannot create the PNG image.");
  const context: CanvasRenderingContext2D = rawContext;

  if (layout === "mobile") return renderMobileTable(canvas, context, table, mobileWidth);

  const padding = 24;
  const headerHeight = 54;
  const minimums = table.type === "leaderboard" ? [70, 280, 72, 72, 100, 110] : [70, 280, 130, 130, 205];
  context.font = '700 16px "Inter"';
  const widths = table.headers.map((header, index) => {
    if (index === 1) return Math.max(minimums[index], Math.min(720, Math.ceil(Math.max(...table.rows.map((row) => context.measureText(row[index]).width), 0) + 30)));
    context.font = '700 12px "Inter"';
    const headerWidth = context.measureText(header).width;
    context.font = '700 16px "Inter"';
    const valueWidth = Math.max(...table.rows.map((row) => context.measureText(row[index]).width), 0);
    return Math.max(minimums[index], Math.ceil(Math.max(headerWidth, valueWidth) + 30));
  });
  const nameLines = table.rows.map((row) => wrapName(context, row[1], widths[1] - 28));
  const rowHeights = nameLines.map((lines) => Math.max(52, lines.length * 20 + 24));
  const width = padding * 2 + widths.reduce((sum, item) => sum + item, 0);
  const height = padding * 2 + headerHeight + rowHeights.reduce((sum, item) => sum + item, 0);
  const scale = width * height < 10_000_000 && height < 8000 ? 2 : 1;
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  if (!canvas.width || !canvas.height) throw new Error("This browser cannot create an image for this table size.");
  context.scale(scale, scale);
  context.clearRect(0, 0, width, height);

  const edges = widths.reduce<number[]>((values, item) => [...values, values.at(-1)! + item], [padding]);
  function border(y: number) {
    context.beginPath();
    context.strokeStyle = colors.border;
    context.lineWidth = 1;
    context.moveTo(padding, y + .5);
    context.lineTo(width - padding, y + .5);
    context.stroke();
  }
  border(padding);
  context.textBaseline = "middle";
  context.fillStyle = colors.secondary;
  context.font = '700 11px "Inter"';
  table.headers.forEach((header, index) => {
    context.textAlign = index < 2 ? "left" : "right";
    context.fillText(header, index < 2 ? edges[index] + 12 : edges[index + 1] - 12, padding + headerHeight / 2);
  });
  let y = padding + headerHeight;
  border(y);
  table.rows.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    if (rowIndex === 0) {
      context.fillStyle = colors.orange;
      context.fillRect(padding, y + 7, 3, rowHeight - 14);
      context.fillRect(edges[0] + 10, y + (rowHeight - 32) / 2, 34, 32);
      context.fillStyle = colors.black;
      context.font = '400 25px "Bebas Neue"';
      context.textAlign = "center";
      context.fillText("#1", edges[0] + 27, y + rowHeight / 2 + 1);
    } else {
      context.fillStyle = colors.orange;
      context.font = '400 27px "Bebas Neue"';
      context.textAlign = "left";
      context.fillText(row[0], edges[0] + 12, y + rowHeight / 2);
    }
    context.fillStyle = colors.foreground;
    context.font = '700 16px "Inter"';
    context.textAlign = "left";
    const lines = nameLines[rowIndex];
    lines.forEach((line, lineIndex) => context.fillText(line, edges[1] + 12, y + rowHeight / 2 + (lineIndex - (lines.length - 1) / 2) * 20));
    row.slice(2).forEach((value, offset) => {
      const index = offset + 2;
      context.fillStyle = (table.type === "leaderboard" ? index === 5 : index === 2) ? colors.orange : colors.foreground;
      context.font = '700 15px "Inter"';
      context.textAlign = "right";
      context.fillText(value, edges[index + 1] - 12, y + rowHeight / 2);
    });
    y += rowHeight;
    border(y);
  });
  return encodePng(canvas);
}

export async function copyPng(blob: Blob, clipboard: Pick<Clipboard, "write"> | undefined = typeof navigator === "undefined" ? undefined : navigator.clipboard, itemConstructor: typeof ClipboardItem | undefined = typeof ClipboardItem === "undefined" ? undefined : ClipboardItem): Promise<boolean> {
  if (!clipboard?.write || !itemConstructor) return false;
  try {
    await clipboard.write([new itemConstructor({ "image/png": blob })]);
    return true;
  } catch { return false; }
}

export function downloadPng(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  try { link.click(); }
  finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
