import assert from "node:assert/strict";
import test from "node:test";
import { profileSchema } from "../features/profile/schema.ts";

test("profile input trims and normalizes a valid username", () => {
  const profile = profileSchema.parse({ displayName: "  Alex  ", username: "  Alex_22  ", avatarUrl: "" });
  assert.equal(profile.displayName, "Alex");
  assert.equal(profile.username, "alex_22");
});

test("profile rejects unsafe avatar schemes and malformed usernames", () => {
  assert.equal(profileSchema.safeParse({ displayName: "Alex", username: "alex", avatarUrl: "javascript:alert(1)" }).success, false);
  assert.equal(profileSchema.safeParse({ displayName: "Alex", username: "al-ex", avatarUrl: "" }).success, false);
});
