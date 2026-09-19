export type DeviceInfo = { deviceName: string; browser: string; os: string; deviceType: "Phone" | "Tablet" | "Desktop" };

/** Coarse labels only; no fingerprint, IP address, or full user agent is stored. */
export function deviceInfo(userAgent: string | null): DeviceInfo {
  const ua = (userAgent ?? "").slice(0, 512);
  const os = /iPad/i.test(ua) ? "iPadOS" : /iPhone|iPod/i.test(ua) ? "iOS" : /Android/i.test(ua) ? "Android" : /Windows/i.test(ua) ? "Windows" : /Mac OS X|Macintosh/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown OS";
  const browser = /Edg\//i.test(ua) ? "Edge" : /OPR\//i.test(ua) ? "Opera" : /Firefox\//i.test(ua) ? "Firefox" : /Chrome\//i.test(ua) || /CriOS\//i.test(ua) ? "Chrome" : /Safari\//i.test(ua) ? "Safari" : "Browser";
  const deviceType = /iPad|Tablet/i.test(ua) || /Android/i.test(ua) && !/Mobile/i.test(ua) ? "Tablet" : /iPhone|iPod|Android.*Mobile|Mobile/i.test(ua) ? "Phone" : "Desktop";
  return { deviceName: `${browser} · ${os}`, browser, os, deviceType };
}
