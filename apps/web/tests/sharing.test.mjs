import assert from "node:assert/strict";
import test from "node:test";
import { LIVE_DURATION_MS, publicTokenIsValid, shareExpiry } from "../features/sharing/share-token.ts";

test("temporary public sessions expire exactly six hours after activation", () => {
  const now = new Date("2026-09-16T02:00:00.000Z");
  assert.equal(LIVE_DURATION_MS, 21_600_000);
  assert.equal(shareExpiry(now).toISOString(), "2026-09-16T08:00:00.000Z");
});

test("public share tokens accept only the generated base64url shape", () => {
  assert.equal(publicTokenIsValid("A2345678901234567890123456789012345678901-_"), true);
  assert.equal(publicTokenIsValid("short"), false);
  assert.equal(publicTokenIsValid("A2345678901234567890123456789012345678901+/"), false);
});
