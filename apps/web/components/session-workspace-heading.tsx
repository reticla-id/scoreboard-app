import Link from "next/link";
import { SessionTabs } from "@/components/session-tabs";
import { formatSessionSchedule } from "@/features/sessions/dates";
import type { getOwnedSession } from "@/features/sessions/data";
import { readPartnerMode } from "@/features/sports/padel/partner-modes";

type Session = Awaited<ReturnType<typeof getOwnedSession>>;
type ActiveTab = "overview" | "players" | "matches" | "leaderboard";

export function SessionWorkspaceHeading({ session, active }: { session: Session; active: ActiveTab }) {
  const partnerMode = readPartnerMode(session.partnerMode);

  return <header className="session-workspace-head">
    <p className="eyebrow"><span className="dot" /> {session.sportConfig.name.toUpperCase()} / SESSION</p>
    <h1>{session.name}</h1>
    <div className="session-meta-line"><span>{formatSessionSchedule(session.date, session.startTime)}</span>{session.location && <span>{session.location}</span>}<Link className="text-link" href={`/sessions/${session.id}/edit`}>Edit details</Link></div>
    <div className="session-partner-mode"><span>PARTNER MODE</span><strong>{partnerMode === "FIXED" ? "Fixed Partners" : "Random Partners"}</strong></div>
    <SessionTabs sessionId={session.id} active={active} />
  </header>;
}
