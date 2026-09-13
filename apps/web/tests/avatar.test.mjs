import assert from "node:assert/strict";
import test from "node:test";
import { avatarExtension, avatarSource, ownedAvatarPath } from "../features/profile/avatar.ts";

const user = "6432fa27-2fa4-48e7-aa64-ae866537d0b0";
const other = "eaeb87a8-eb21-4638-b72d-40fa40c3d3af";
const file = "76f3ec87-4f3c-4c84-b93f-1030fa831d7e";

test("private avatar paths only resolve for their owner", () => {
  assert.equal(ownedAvatarPath(`storage:${user}/${file}.png`, user), `${user}/${file}.png`);
  assert.equal(ownedAvatarPath(`storage:${other}/${file}.png`, user), null);
  assert.equal(ownedAvatarPath(`storage:${user}/../${file}.png`, user), null);
  assert.equal(ownedAvatarPath(`storage:${user}/${file}.svg`, user), null);
  assert.equal(avatarSource(`storage:${user}/${file}.png`, new Date(1000)), `/avatar?owner=${user}&v=1000`);
});

test("avatar validation checks file signature and declared type", () => {
  assert.equal(avatarExtension(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), "png");
  assert.equal(avatarExtension(Uint8Array.from([255, 216, 255]), "image/jpeg"), "jpg");
  assert.equal(avatarExtension(Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]), "image/webp"), "webp");
  assert.equal(avatarExtension(Uint8Array.from([60, 115, 118, 103]), "image/png"), null);
  assert.equal(avatarExtension(Uint8Array.from([255, 216, 255]), "image/svg+xml"), null);
});
