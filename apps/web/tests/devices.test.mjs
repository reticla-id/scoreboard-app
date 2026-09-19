import assert from "node:assert/strict";
import test from "node:test";
import { admissionDecision } from "../features/auth/device-policy.ts";
import { deviceInfo } from "../features/auth/device-info.ts";

test("device admission allows three sessions, rejects a fourth, and never revives a revoked session", () => {
  assert.equal(admissionDecision(null, "user", 0), "new");
  assert.equal(admissionDecision(null, "user", 2), "new");
  assert.equal(admissionDecision(null, "user", 3), "limit");
  assert.equal(admissionDecision({ userId: "user", revokedAt: null }, "user", 3), "active");
  assert.equal(admissionDecision({ userId: "user", revokedAt: new Date() }, "user", 0), "revoked");
  assert.equal(admissionDecision({ userId: "another", revokedAt: null }, "user", 0), "revoked");
});

test("device labels contain only coarse browser, OS, and device type", () => {
  assert.deepEqual(deviceInfo("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36"), {
    deviceName: "Chrome · Android", browser: "Chrome", os: "Android", deviceType: "Phone",
  });
  assert.deepEqual(deviceInfo("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15"), {
    deviceName: "Safari · macOS", browser: "Safari", os: "macOS", deviceType: "Desktop",
  });
});
