import Link from "next/link";
import { formatMonth, formatSessionSchedule, sessionLifecycle } from "@/features/sessions/dates";
import { resolveSport } from "@/features/sports/sport-registry";
import { readMatchFormat } from "@/features/sports/formats";

export type SessionPreview = {
  id: string;
  name: string;
  date: Date;
  startTime: string | null;
  completedAt: Date | null;
  location: string | null;
  sport: string;
  matchFormat: string;
  partnerMode: string;
  _count: { players: number; rounds: number; matches: number };
  matches: { id: string }[];
};

function nextStep(session: SessionPreview, minimumPlayers: number) {
  if (session._count.rounds) return { action: "View matches", href: `/sessions/${session.id}/matches` };
  if (session._count.players < minimumPlayers) return { action: "Add players", href: `/sessions/${session.id}/players` };
  if (session.matchFormat === "DOUBLES" && session.partnerMode === "FIXED") return { action: "Set partners", href: `/sessions/${session.id}/players` };
  return { action: "Generate round", href: `/sessions/${session.id}/players` };
}

export function SessionCard({ session, view, grouped = false }: { session: SessionPreview; view: "current" | "history"; grouped?: boolean }) {
  const sport = resolveSport(session.sport);
  const format = readMatchFormat(session.matchFormat);
  const minimumPlayers = sport.rules.code === "TENNIS" ? sport.rules.tennisMinimumPlayers(format) : sport.rules.minimumPlayers;
  const step = nextStep(session, minimumPlayers);
  const lifecycle = sessionLifecycle(session);
  return <article className={`browse-session-row ${view === "history" ? "browse-history-row" : ""}`}>
    <div className="browse-date-block" aria-hidden="true"><strong>{session.date.getUTCDate().toString().padStart(2, "0")}</strong><span>{new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(session.date)}</span></div>
    <Link className="browse-session-main" href={`/sessions/${session.id}`}><span className="browse-session-title"><strong>{session.name}</strong>{view === "history" && session.completedAt && <span className="session-finished-mark" title="Finished session" aria-label="Finished session"><svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 10 3 3 7-7" /></svg></span>}</span><span className="browse-session-identity">{sport.name} · {format === "SINGLES" ? "Singles" : "Doubles"}{view === "current" ? ` · ${lifecycle}` : ""}</span><span>{grouped ? session.startTime ?? "Time not set" : formatSessionSchedule(session.date, session.startTime)}{session.location ? ` · ${session.location}` : ""}</span><small>{view === "history" ? `${session._count.matches} matches` : `${session._count.players} players · ${session._count.rounds} rounds`}</small></Link>
    <div className="browse-session-end"><Link href={view === "history" ? `/sessions/${session.id}` : step.href}>{view === "history" ? "View" : step.action} <span aria-hidden="true">→</span></Link></div>
  </article>;
}

export function SessionRows({ sessions, view, emptyTitle, emptyText, grouped = false }: { sessions: SessionPreview[]; view: "current" | "history"; emptyTitle: string; emptyText: string; grouped?: boolean }) {
  if (!sessions.length) return <div className="session-list-empty"><h3>{emptyTitle}</h3><p className="muted">{emptyText}</p></div>;
  if (!grouped) return <div className="browse-session-list">{sessions.map((session) => <SessionCard key={session.id} session={session} view={view} />)}</div>;
  const groups = new Map<string, SessionPreview[]>();
  for (const session of sessions) {
    const month = formatMonth(session.date);
    groups.set(month, [...(groups.get(month) ?? []), session]);
  }
  return <div className="browse-session-groups">{Array.from(groups, ([month, rows]) => <section className="browse-month" key={month} aria-label={month}><h3>{month}</h3><div className="browse-session-list">{rows.map((session) => <SessionCard key={session.id} session={session} view={view} grouped />)}</div></section>)}</div>;
}
