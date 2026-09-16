import Link from "next/link";

export function SessionTabs({ sessionId, active }: { sessionId: string; active: "overview" | "players" | "matches" | "leaderboard" }) {
  return <nav className="session-tabs" aria-label="Session navigation">
    <Link href={`/sessions/${sessionId}`} prefetch={false} aria-current={active === "overview" ? "page" : undefined}>Overview</Link>
    <Link href={`/sessions/${sessionId}/players`} prefetch={false} aria-current={active === "players" ? "page" : undefined}>Players</Link>
    <Link href={`/sessions/${sessionId}/matches`} prefetch={false} aria-current={active === "matches" ? "page" : undefined}>Matches</Link>
    <Link href={`/sessions/${sessionId}/leaderboard`} prefetch={false} aria-current={active === "leaderboard" ? "page" : undefined}>Leaderboard</Link>
  </nav>;
}
