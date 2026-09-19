import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppFooter } from "@/components/app-footer";
import { formatSessionSchedule } from "@/features/sessions/dates";
import { ResultsView } from "@/features/leaderboard/results-view";
import { getPublicSession } from "@/features/sharing/data";
import { PublicSessionActions } from "@/features/sharing/public-session-actions";
import { RoundSelector } from "@/features/matches/round-selector";
import { calculateTennisScore, readTennisPointHistory } from "@/features/sports/tennis/scoring";

export const metadata: Metadata = { title: "Live session" };
export const dynamic = "force-dynamic";

function positiveNumber(value: string | string[] | undefined) {
  const input = Array.isArray(value) ? value[0] : value;
  return input && /^[1-9]\d*$/.test(input) ? Number(input) : undefined;
}

function liveHref(token: string, values: { round?: number; page?: number; playersPage?: number }) {
  const query = new URLSearchParams();
  if (values.round) query.set("round", String(values.round));
  if (values.page && values.page > 1) query.set("page", String(values.page));
  if (values.playersPage && values.playersPage > 1) query.set("playersPage", String(values.playersPage));
  const suffix = query.toString();
  return `/live/${token}${suffix ? `?${suffix}` : ""}`;
}

function PublicAdvancedTracking({ players, eventCounts, glossary }: {
  players: { id: string; name: string }[];
  eventCounts: { playerId: string; type: string; count: number }[];
  glossary: readonly { code: string; name: string }[];
}) {
  return <details className="advanced-tracker public-match-tracking"><summary className="tracker-toggle">Advanced tracking <span aria-hidden="true">+</span></summary><div className="tracker-content"><p>Recorded player outcomes for this match.</p><div className="tracker-players">{players.map((player) => <div className="public-tracking-player" key={player.id}><span>{player.name}</span><small>{glossary.map((item) => `${item.code} ${eventCounts.find((entry) => entry.playerId === player.id && entry.type === item.code)?.count ?? 0}`).join(" · ")}</small></div>)}</div></div></details>;
}

export default async function PublicSessionPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ round?: string | string[]; page?: string | string[]; playersPage?: string | string[] }> }) {
  const { token } = await params;
  const query = await searchParams;
  const data = await getPublicSession(token, positiveNumber(query.round), positiveNumber(query.page) ?? 1, positiveNumber(query.playersPage) ?? 1);
  if (!data) redirect("/?source=live-session");

  const { session, counts, matches, results } = data;
  return <main className="site-shell public-session-page">
    <header className="public-session-nav"><span className="brand">RETICLA</span><span>READ-ONLY LIVE SESSION</span></header>
    <section className="public-session-hero"><div><p className="eyebrow"><span className="dot" /> {session.sportConfig.name.toUpperCase()} / LIVE</p><h1>{session.name}</h1><p>{formatSessionSchedule(session.date, session.startTime)}{session.location ? ` · ${session.location}` : ""}</p><small>Last updated {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(data.lastUpdated)}</small></div><PublicSessionActions /></section>
    <section className="public-overview" aria-labelledby="public-overview-title"><div><span className="panel-index">SESSION OVERVIEW</span><h2 id="public-overview-title">AT A GLANCE.</h2></div><div className="session-metrics"><div><span>PLAYERS</span><strong>{counts.players}</strong></div><div><span>MATCHES</span><strong>{counts.matches}</strong></div><div><span>UPCOMING</span><strong>{counts.upcoming}</strong></div><div><span>LIVE</span><strong>{counts.live}</strong></div><div><span>FINISHED</span><strong>{counts.finished}</strong></div></div></section>
    <details className="public-players" open={data.playerPage > 1}><summary><span><small>SESSION ROSTER</small><strong>Players</strong></span><span>{counts.players} players <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 9 6 6 6-6" /></svg></span></summary><div className="public-player-grid">{data.players.map((player, index) => <div className="public-player-row" key={player.id}><span>{String((data.playerPage - 1) * 24 + index + 1).padStart(2, "0")}</span><strong>{player.name}</strong></div>)}</div>{data.playerPages > 1 && <nav className="public-player-pagination" aria-label="Player list pages"><span>Page {data.playerPage} of {data.playerPages}</span><div>{data.playerPage > 1 && <Link className="button button-secondary button-small" href={liveHref(token, { round: data.selectedRound?.number, page: data.page, playersPage: data.playerPage - 1 })}>Previous</Link>}{data.playerPage < data.playerPages && <Link className="button button-secondary button-small" href={liveHref(token, { round: data.selectedRound?.number, page: data.page, playersPage: data.playerPage + 1 })}>Next</Link>}</div></nav>}</details>
    <section className="public-matches games-workspace" aria-labelledby="public-matches-title"><div className="games-heading"><div><span className="panel-index">GENERATED GAMES</span><h2 id="public-matches-title">MATCHES.</h2></div></div>{data.selectedRound ? <><RoundSelector rounds={data.rounds} selected={data.selectedRound} basePath={`/live/${token}`} /><section className="round-section public-round" aria-label={`Round ${data.selectedRound.number} matches`}><div className="game-list">{matches.map((match) => {
      const label = match.status === "LIVE" ? "Live" : match.status === "FINISHED" ? "Finished" : "Upcoming";
      const hasScore = match.scoreA !== null && match.scoreB !== null;
      if (session.sport === "TENNIS") {
        const score = calculateTennisScore(readTennisPointHistory(match.scoreState));
        const teamA = [match.teamA.playerOne, match.teamA.playerTwo].filter((player): player is { id: string; name: string } => player !== null);
        const teamB = [match.teamB.playerOne, match.teamB.playerTwo].filter((player): player is { id: string; name: string } => player !== null);
        const phase = score.phase === "TIEBREAK" ? "Tie-break" : score.phase === "DEUCE" ? "Deuce" : score.phase === "ADVANTAGE" ? "Advantage" : score.phase === "FINISHED" ? "Final" : "Current game";
        return <article className={`game-row tennis-match${match.status === "LIVE" ? " game-row-live" : ""}`} key={match.id}><header className="game-row-label"><span>MATCH {String(match.position).padStart(2, "0")}</span><span className={`match-status match-${label.toLowerCase()}`}>{label}</span></header><div className="tennis-scoreboard"><div className="tennis-score-head"><span>{phase}</span>{[0, 1, 2].map((set) => <span key={set}>SET {set + 1}</span>)}<span>POINTS</span></div>{(["A", "B"] as const).map((side) => <div className={`tennis-score-row${match.status === "FINISHED" && score.winner === side ? " tennis-score-winner" : ""}`} key={side}><strong>{(side === "A" ? teamA : teamB).map((player) => player.name).join(" + ")}</strong>{[0, 1, 2].map((set) => <span className="tennis-set-score" key={set}>{score.sets[set] ? (side === "A" ? score.sets[set].gamesA : score.sets[set].gamesB) : "—"}</span>)}<b className="tennis-point-score">{match.status === "UPCOMING" ? "—" : side === "A" ? score.pointA : score.pointB}</b></div>)}</div></article>;
      }
      if (!match.teamA.playerTwo || !match.teamB.playerTwo) return null;
      return <article className={`game-row${match.status === "LIVE" ? " game-row-live" : ""}`} key={match.id}><header className="game-row-label"><span>MATCH {String(match.position).padStart(2, "0")}</span><span className={`match-status match-${label.toLowerCase()}`}>{label}</span></header><div className="game-row-play"><div className="game-score"><span>SCORE</span><strong aria-label={hasScore ? `Team A ${match.scoreA}, Team B ${match.scoreB}` : "Score not entered"}>{hasScore ? `${match.scoreA}-${match.scoreB}` : "-"}</strong></div><div className={`game-team game-team-a ${match.status === "FINISHED" && hasScore && match.scoreA! > match.scoreB! ? "game-winner" : ""}`}><span>TEAM A</span><strong><span>{match.teamA.playerOne.name}</span><span>{match.teamA.playerTwo.name}</span></strong></div><div className={`game-team game-team-b ${match.status === "FINISHED" && hasScore && match.scoreB! > match.scoreA! ? "game-winner" : ""}`}><span>TEAM B</span><strong><span>{match.teamB.playerOne.name}</span><span>{match.teamB.playerTwo.name}</span></strong></div></div>{match.status !== "UPCOMING" && <PublicAdvancedTracking players={[match.teamA.playerOne, match.teamA.playerTwo, match.teamB.playerOne, match.teamB.playerTwo]} eventCounts={match.eventCounts} glossary={session.sportConfig.rules.eventGlossary} />}</article>;
    })}</div></section></> : <div className="standings-empty"><h3>NO MATCHES YET.</h3><p className="muted">The host has not generated a round.</p></div>}</section>
    {data.selectedRound && data.pages > 1 && <nav className="game-pagination" aria-label="Public match pages"><span>Showing {(data.page - 1) * 60 + 1}–{Math.min(data.page * 60, data.selectedRound.matchCount)} of {data.selectedRound.matchCount.toLocaleString("en-US")}</span><div>{data.page > 1 && <Link className="button button-secondary button-small" href={liveHref(token, { round: data.selectedRound.number, page: data.page - 1, playersPage: data.playerPage })}>Previous</Link>}{data.page < data.pages && <Link className="button button-secondary button-small" href={liveHref(token, { round: data.selectedRound.number, page: data.page + 1, playersPage: data.playerPage })}>Next</Link>}</div></nav>}
    <ResultsView sessionId={session.id} sport={session.sport} {...results} eventGlossary={session.sportConfig.rules.eventGlossary} publicView />
    <aside className="public-session-notice">This is a temporary, read-only Reticla session page. It may expire automatically or be disabled by the host.</aside>
    <AppFooter />
  </main>;
}
