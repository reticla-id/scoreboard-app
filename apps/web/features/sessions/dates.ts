export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function todayKey(now = new Date()) {
  return dateKey(now);
}

export function dateFromInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export type SessionLifecycle = "Upcoming" | "Active" | "History";

// Session dates and times are court-local wall times. The MVP currently uses one
// court time zone; this can become a per-session field when scheduling expands.
export const COURT_TIME_ZONE = "Asia/Jakarta";

export function sessionLifecycle(
  session: { date: Date; startTime: string | null; completedAt: Date | null },
  now = new Date(),
  timeZone = COURT_TIME_ZONE,
): SessionLifecycle {
  if (session.completedAt) return "History";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const current = `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
  const scheduled = `${dateKey(session.date)}T${session.startTime ?? "00:00"}`;
  return scheduled > current ? "Upcoming" : "Active";
}

export function formatSessionDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatSessionSchedule(date: Date, startTime: string | null) {
  return `${formatSessionDate(date)} · ${startTime ?? "Time not set"}`;
}

export function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(date).toUpperCase();
}
