import assert from "node:assert/strict";
import test from "node:test";
import { sessionDetailsInput, sessionInput, sessionSchema } from "../features/sessions/schema.ts";
import { dateFromInput, dateKey, formatSessionSchedule, sessionLifecycle } from "../features/sessions/dates.ts";
import { isAvailableSport, sportName } from "../features/sports/catalog.ts";
import { resolveSportRules } from "../features/sports/sport-registry.ts";

test("a valid padel session keeps its calendar date and trims text", () => {
  const parsed = sessionSchema.parse({ name: "  Friday Padel  ", date: "2026-09-12", startTime: "19:00", sport: "PADEL", matchFormat: "DOUBLES", location: "  Court A  " });
  assert.equal(parsed.name, "Friday Padel");
  assert.equal(parsed.location, "Court A");
  assert.equal(dateKey(dateFromInput(parsed.date)), "2026-09-12");
  assert.equal(formatSessionSchedule(dateFromInput(parsed.date), parsed.startTime), "Sat, Sep 12, 2026 · 19:00");
});

test("invalid calendar dates and unavailable sports are rejected", () => {
  assert.equal(sessionSchema.safeParse({ name: "Game", date: "2026-02-30", startTime: "19:00", sport: "PADEL", location: "" }).success, false);
  assert.equal(sessionSchema.safeParse({ name: "Game", date: "0000-01-01", startTime: "19:00", sport: "PADEL", location: "" }).success, false);
  assert.equal(sessionSchema.safeParse({ name: "Game", date: "2026-09-12", startTime: "24:00", sport: "PADEL", location: "" }).success, false);
  assert.equal(sessionSchema.safeParse({ name: "Game", date: "2026-09-12", startTime: "19:75", sport: "PADEL", location: "" }).success, false);
  assert.equal(sessionSchema.safeParse({ name: "Game", date: "2026-09-12", startTime: "19:00", sport: "BASKETBALL", matchFormat: "DOUBLES", location: "" }).success, false);
});

test("session creation requires the supported sport and edit ignores sport changes", () => {
  const form = new FormData();
  form.set("name", "Friday game");
  form.set("date", "2026-09-12");
  form.set("startTime", "08:30");
  assert.equal(sessionInput(form).success, false);
  form.set("sport", "PADEL");
  form.set("matchFormat", "DOUBLES");
  const parsed = sessionInput(form);
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.sport, "PADEL");
  form.set("sport", "TENNIS");
  form.set("matchFormat", "SINGLES");
  assert.equal(sessionInput(form).success, true);
  const details = sessionDetailsInput(form);
  assert.equal(details.success, true);
  if (details.success) assert.equal(Object.hasOwn(details.data, "sport"), false);
});

test("session lifecycle uses calendar history while explicit finish remains the lock", () => {
  const session = { date: dateFromInput("2026-09-13"), startTime: "19:00", completedAt: null };
  assert.equal(sessionLifecycle(session, new Date("2026-09-12T12:00:00Z")), "Upcoming");
  assert.equal(sessionLifecycle(session, new Date("2026-09-13T01:00:00Z")), "Active");
  assert.equal(sessionLifecycle(session, new Date("2026-09-14T01:00:00Z")), "History");
  assert.equal(sessionLifecycle({ ...session, completedAt: new Date("2026-09-13T10:00:00Z") }, new Date("2026-09-13T11:59:00Z")), "History");
  assert.equal(sessionLifecycle({ ...session, startTime: null }, new Date("2026-09-13T00:00:00Z")), "Active");
});

test("sport registry routes Padel and Tennis to dedicated rules", () => {
  assert.equal(isAvailableSport("PADEL"), true);
  assert.equal(isAvailableSport("TENNIS"), true);
  assert.equal(sportName("PADEL"), "Padel");
  assert.equal(resolveSportRules("TENNIS").code, "TENNIS");
  const rules = resolveSportRules("PADEL");
  assert.equal(rules.minimumPlayers, 4);
  assert.deepEqual(rules.eventTypes, ["W", "FE", "UE", "DF"]);
  assert.equal(rules.plannedRoundMatchCount(4), 3);
  assert.equal(rules.pointWinningSide("A", "FE"), "B");
});
