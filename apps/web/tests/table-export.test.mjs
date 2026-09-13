import assert from "node:assert/strict";
import test from "node:test";
import { tableExportData } from "../features/leaderboard/table-export-data.ts";
import { copyPng, downloadPng, renderTransparentTablePng, visibleExportLayout } from "../features/leaderboard/table-image-export.ts";

const standing = (id, name, wins, losses, difference, winPercent) => ({ id, name, wins, losses, difference, winPercent, matchesPlayed: wins + losses, gamesWon: 0, gamesLost: 0 });
const player = (id, name, netScore, efficiency, winners, forcedErrors, unforcedErrors, doubleFaults) => ({ id, name, netScore, efficiency, winners, forcedErrors, unforcedErrors, doubleFaults, wins: 0 });

test("leaderboard export keeps the displayed random and fixed-partner columns and ordering", () => {
  const rows = [standing("b", "Budi", 3, 1, 7, 75), standing("a", "Andi", 1, 2, -2, 33.3333)];
  const random = tableExportData({ type: "leaderboard", rows, partnerMode: "RANDOM" });
  assert.deepEqual(random.headers, ["RANK", "PLAYER", "W", "L", "DIFF", "WIN %"]);
  assert.deepEqual(random.rows, [["#1", "Budi", "3", "1", "+7", "75.0%"], ["02", "Andi", "1", "2", "-2", "33.3%"]]);
  assert.equal(random.filename, "reticla-leaderboard.png");
  assert.deepEqual(random.mobileRows[0], { rank: "#1", name: "Budi", primary: "75.0%", secondary: "3 W · 1 L", detailLabel: "DIFF / PLAYED", detailValue: "+7 / 4" });
  const fixed = tableExportData({ type: "leaderboard", rows: [standing("a:b", "Andi + Budi", 2, 0, 5, 100)], partnerMode: "FIXED" });
  assert.equal(fixed.headers[1], "PARTNERS");
  assert.equal(fixed.rows[0][1], "Andi + Budi");
});

test("Player Stats export keeps individual net, efficiency, and all four outcomes", () => {
  const table = tableExportData({ type: "stats", rows: [
    player("a", "Andi", 14, 93.75, 15, 2, 1, 0),
    player("b", "Budi", -3, null, 0, 4, 2, 1),
  ] });
  assert.deepEqual(table.headers, ["RANK", "PLAYER", "NET SCORE", "EFFICIENCY", "W / FE / UE / DF"]);
  assert.deepEqual(table.rows[0], ["#1", "Andi", "+14", "93.8%", "15 / 2 / 1 / 0"]);
  assert.deepEqual(table.rows[1], ["02", "Budi", "-3", "—", "0 / 4 / 2 / 1"]);
  assert.equal(table.filename, "reticla-player-stats.png");
  assert.deepEqual(table.mobileRows[0], { rank: "#1", name: "Andi", primary: "+14", secondary: "93.8%", secondaryLabel: "efficiency", detailLabel: "W / FE / UE / DF", detailValue: "15 / 2 / 1 / 0" });
});

test("the export layout follows the visible responsive list and its current width", () => {
  const previous = globalThis.getComputedStyle;
  let display = "block";
  globalThis.getComputedStyle = () => ({ display });
  const root = { parentElement: { querySelector: () => ({ getBoundingClientRect: () => ({ width: 288 }) }) } };
  try {
    assert.deepEqual(visibleExportLayout(root), { layout: "mobile", width: 288 });
    display = "none";
    assert.deepEqual(visibleExportLayout(root), { layout: "desktop" });
  } finally { globalThis.getComputedStyle = previous; }
});

test("transparent canvas renders every row, waits for fonts, and never fills the page background", async () => {
  const previous = globalThis.document;
  const calls = { fonts: [], clear: [], fills: [], text: [], textColors: [], borders: [], width: 0, height: 0 };
  const context = {
    font: "", fillStyle: "", strokeStyle: "", lineWidth: 0, textAlign: "", textBaseline: "",
    measureText: (value) => ({ width: value.length * 8 }),
    scale() {}, clearRect: (...args) => calls.clear.push(args),
    fillRect: (...args) => calls.fills.push(args),
    fillText: (value) => { calls.text.push(value); calls.textColors.push(context.fillStyle); },
    beginPath() {}, moveTo() {}, lineTo() {}, stroke: () => calls.borders.push(context.strokeStyle),
  };
  const canvas = {
    getContext: () => context,
    set width(value) { calls.width = value; }, get width() { return calls.width; },
    set height(value) { calls.height = value; }, get height() { return calls.height; },
    toBlob: (callback, type) => callback(new Blob(["same image"], { type })),
  };
  globalThis.document = { fonts: { load: async (font) => { calls.fonts.push(font); return []; }, ready: Promise.resolve() }, createElement: () => canvas };
  try {
    const longName = "Alexandria Very Long Courtside Player Name ".repeat(5);
    const table = tableExportData({ type: "leaderboard", rows: Array.from({ length: 120 }, (_, index) => standing(String(index), index === 0 ? longName : `Player ${index}`, 1, 0, 2, 100)), partnerMode: "RANDOM" });
    const blob = await renderTransparentTablePng(table);
    assert.equal(blob.type, "image/png");
    assert.ok(calls.fonts.some((font) => font.includes("Inter")));
    assert.ok(calls.fonts.some((font) => font.includes("Bebas Neue")));
    assert.equal(calls.clear.length, 1);
    assert.equal(calls.clear[0][0], 0);
    assert.equal(calls.clear[0][1], 0);
    assert.ok(calls.width > 900 && calls.height > 5000);
    assert.ok(calls.fills.every(([, , width, height]) => width <= 3 || width <= 34 && height <= 32), "Only the rank accent may be filled, never the canvas background.");
    assert.ok(calls.textColors.includes("#ffffff") && calls.textColors.includes("#f47b20"));
    assert.ok(calls.borders.length > 120 && calls.borders.every((color) => color === "#2a2a2a"));
    assert.equal(calls.text.filter((value) => /^Player \d+$/.test(value)).length, 119);
    assert.ok(calls.text.join("").includes("Alexandria"), "The long name is wrapped rather than clipped.");
    const stats = tableExportData({ type: "stats", rows: [player("a", "Andi", 14, 93.75, 15, 2, 1, 0)] });
    await renderTransparentTablePng(stats);
    assert.ok(calls.text.includes("NET SCORE") && calls.text.includes("W / FE / UE / DF"));
    for (const mobileWidth of [288, 343, 358, 398]) {
      calls.text.length = 0;
      calls.fills.length = 0;
      await renderTransparentTablePng(tableExportData({ type: "leaderboard", rows: [standing("a", longName, 3, 1, 7, 75), standing("b", "Budi", 1, 2, -2, 33.3)], partnerMode: "RANDOM" }), "mobile", mobileWidth);
      assert.equal(calls.width, mobileWidth * 2);
      assert.ok(calls.text.includes("75.0%") && calls.text.includes("DIFF / PLAYED") && calls.text.includes("+7 / 4"));
      assert.ok(!calls.text.includes("RANK") && !calls.text.includes("WIN %"), "Mobile output uses compact rows, not the desktop header.");
      assert.ok(calls.text.filter((value) => value.includes("Alexandria")).length > 1, "Long names wrap within the mobile row.");
      assert.ok(calls.fills.every(([, , width, height]) => width <= 32 && height <= 32 || width === 3), "Mobile background remains transparent.");
    }
    calls.text.length = 0;
    await renderTransparentTablePng(stats, "mobile", 288);
    assert.equal(calls.width, 576);
    assert.ok(calls.text.includes("+14") && calls.text.includes("93.8%") && calls.text.includes("efficiency") && calls.text.includes("W / FE / UE / DF"));
    assert.ok(!calls.text.includes("NET SCORE"), "Stats mobile output follows the compact row structure.");
  } finally { globalThis.document = previous; }
});

test("clipboard copy succeeds, and unsupported or failed image writes keep the PNG usable", async () => {
  const blob = new Blob(["png"], { type: "image/png" });
  class Item { constructor(data) { this.data = data; } }
  let copied;
  assert.equal(await copyPng(blob, { write: async (items) => { copied = items[0].data["image/png"]; } }, Item), true);
  assert.equal(copied, blob);
  assert.equal(await copyPng(blob, undefined, undefined), false);
  assert.equal(await copyPng(blob, { write: async () => { throw new Error("blocked"); } }, Item), false);
  assert.equal(blob.size, 3, "Clipboard failure does not mutate the generated asset.");
});

test("download uses the same PNG blob and the requested filename", () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  const blob = new Blob(["png"], { type: "image/png" });
  const calls = { appended: false, clicked: false, removed: false, revoked: false };
  const anchor = { hidden: false, href: "", download: "", click: () => { calls.clicked = true; }, remove: () => { calls.removed = true; } };
  globalThis.document = { createElement: () => anchor, body: { append: () => { calls.appended = true; } } };
  globalThis.window = { setTimeout: (callback) => callback() };
  URL.createObjectURL = (value) => { assert.equal(value, blob); return "blob:reticla-test"; };
  URL.revokeObjectURL = (value) => { assert.equal(value, "blob:reticla-test"); calls.revoked = true; };
  try {
    downloadPng(blob, "reticla-player-stats.png");
    assert.equal(anchor.download, "reticla-player-stats.png");
    assert.equal(anchor.href, "blob:reticla-test");
    assert.deepEqual(calls, { appended: true, clicked: true, removed: true, revoked: true });
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
  }
});
