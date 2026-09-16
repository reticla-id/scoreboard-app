export const LIVE_DURATION_MS = 6 * 60 * 60 * 1000;

export function publicTokenIsValid(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function shareExpiry(now: Date) {
  return new Date(now.getTime() + LIVE_DURATION_MS);
}
