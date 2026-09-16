"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LeaderboardRow, PlayerRankingRow } from "./calculate";
import type { PartnerMode } from "@/features/sports/padel/partner-modes";
import type { EventType } from "@/features/matches/scoring";
import { TableExportActions } from "./table-export-actions";
import { ArrowUpRightIcon } from "@/components/action-icons";

function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
function efficiency(value: number | null) { return value === null ? "—" : `${value.toFixed(1)}%`; }
function outcomes(row: PlayerRankingRow) { return `${row.winners} / ${row.forcedErrors} / ${row.unforcedErrors} / ${row.doubleFaults}`; }
function Rank({ index }: { index: number }) { return index === 0 ? <span className="leader-marker">#1</span> : <>{String(index + 1).padStart(2, "0")}</>; }

export function ResultsView({ sessionId, standings, playerRanking, partnerMode, scoredMatches, trackedEvents, eventGlossary, supportsPlayerStats = true, publicView = false }: {
  sessionId: string;
  standings: LeaderboardRow[];
  playerRanking: PlayerRankingRow[];
  partnerMode: PartnerMode;
  scoredMatches: number;
  trackedEvents: number;
  eventGlossary: readonly { code: EventType; name: string; description: string }[];
  supportsPlayerStats?: boolean;
  publicView?: boolean;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [view, setView] = useState<"leaderboard" | "stats">("leaderboard");
  const fixed = partnerMode === "FIXED";
  const refresh = <button className={`results-action-button${refreshing ? " is-refreshing" : ""}`} type="button" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}><svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 0-2 5" /></svg>{refreshing ? "Refreshing…" : "Refresh"}</button>;
  return <section className="standings results-view" aria-labelledby="results-heading">
    {supportsPlayerStats && <div className="results-segment" role="group" aria-label="Session results view">
      <button type="button" aria-pressed={view === "leaderboard"} onClick={() => setView("leaderboard")}>Leaderboard</button>
      <button type="button" aria-pressed={view === "stats"} onClick={() => setView("stats")}>Player Stats</button>
    </div>}
    <div className="results-heading-line"><div className="standings-heading"><span className="panel-index">SESSION RESULTS</span><h2 id="results-heading">{view === "leaderboard" ? "LEADERBOARD." : "PLAYER STATS."}</h2><p className="muted">{view === "leaderboard" ? `${scoredMatches} finished match${scoredMatches === 1 ? "" : "es"} · ${fixed ? "fixed partners" : "individual players"} · ranked by win rate` : `${trackedEvents} recorded outcome${trackedEvents === 1 ? "" : "s"} · individual player ranking`}</p></div></div>
    {view === "leaderboard" && (scoredMatches === 0 ? <>{!publicView && <div className="results-actions">{refresh}</div>}<div className="standings-empty"><h3>NO RESULTS YET.</h3><p className="muted">Finish a scored match to start the leaderboard.</p>{!publicView && <Link className="button" href={`/sessions/${sessionId}/matches`}>Go to matches <ArrowUpRightIcon /></Link>}</div></> : <>
      <div className="results-actions">{!publicView && refresh}<TableExportActions type="leaderboard" rows={standings} partnerMode={partnerMode} /></div>
      <table className="results-table match-standings-table"><caption className="sr-only">{fixed ? "Fixed partner" : "Player"} standings ranked by win rate</caption><colgroup><col className="rank-col" /><col className="player-col" /><col className="wins-col" /><col className="losses-col" /><col className="diff-col" /><col className="rate-col" /></colgroup><thead><tr><th scope="col">Rank</th><th scope="col">{fixed ? "Partners" : "Player"}</th><th scope="col"><abbr title="Wins">W</abbr></th><th scope="col"><abbr title="Losses">L</abbr></th><th scope="col">Diff</th><th scope="col">Win %</th></tr></thead><tbody>{standings.map((row, index) => <tr key={row.id} className={index === 0 ? "leader-row" : undefined}><td className="results-rank"><Rank index={index} /></td><th scope="row" className="results-name">{row.name}</th><td>{row.wins}</td><td>{row.losses}</td><td>{signed(row.difference)}</td><td className="results-rate">{row.winPercent.toFixed(1)}%</td></tr>)}</tbody></table>
      <ol className="rankings-mobile" aria-label={fixed ? "Fixed partner standings" : "Player standings"}>{standings.map((row, index) => <li key={row.id} className={index === 0 ? "leader-row" : undefined}><span className="results-rank"><Rank index={index} /></span><strong className="results-name">{row.name}</strong><strong className="results-net">{row.winPercent.toFixed(1)}%</strong><span className="results-secondary">{row.wins} W · {row.losses} L</span><span className="results-events"><small>DIFF / PLAYED</small><b>{signed(row.difference)} / {row.matchesPlayed}</b></span></li>)}</ol>
      <p className="muted standings-note">Win rate ranks first so fewer matches do not automatically lower a {fixed ? "pair’s" : "player’s"} position. Average game difference breaks ties.</p>
    </>)}
    {supportsPlayerStats && view === "stats" && (trackedEvents === 0 ? <>{!publicView && <div className="results-actions">{refresh}</div>}<div className="standings-empty"><h3>NO POINTS TRACKED.</h3><p className="muted">Open Advanced Tracking on a live match, then finish it to see player outcomes here.</p>{!publicView && <Link className="button" href={`/sessions/${sessionId}/matches`}>Go to matches <ArrowUpRightIcon /></Link>}</div></> : <>
      {!publicView && <div className="results-actions">{refresh}<TableExportActions type="stats" rows={playerRanking} /></div>}
      <table className="results-table rankings-table"><caption className="sr-only">Individual player ranking by net score and efficiency</caption><colgroup><col className="rank-col" /><col className="player-col" /><col className="net-col" /><col className="eff-col" /><col className="events-col" /></colgroup><thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Net Score</th><th scope="col">Efficiency</th><th scope="col">W / FE / UE / DF</th></tr></thead><tbody>{playerRanking.map((row, index) => <tr key={row.id} className={index === 0 ? "leader-row" : undefined}><td className="results-rank"><Rank index={index} /></td><th scope="row" className="results-name">{row.name}</th><td className="results-net">{signed(row.netScore)}</td><td>{efficiency(row.efficiency)}</td><td className="results-events">{outcomes(row)}</td></tr>)}</tbody></table>
      <ol className="rankings-mobile" aria-label="Individual player statistics ranking">{playerRanking.map((row, index) => <li key={row.id} className={index === 0 ? "leader-row" : undefined}><span className="results-rank"><Rank index={index} /></span><strong className="results-name">{row.name}</strong><strong className="results-net">{signed(row.netScore)}</strong><span className="results-secondary">{efficiency(row.efficiency)} <small>efficiency</small></span><span className="results-events"><small>W / FE / UE / DF</small><b>{outcomes(row)}</b></span></li>)}</ol>
    </>)}
    {supportsPlayerStats && view === "stats" && <details className="ranking-glossary"><summary>Ranking &amp; stats key <span aria-hidden="true">i</span></summary><dl><div><dt>Net Score</dt><dd>Winners − Unforced Errors − Double Faults. Forced Errors do not change this score.</dd></div><div><dt>Efficiency</dt><dd>Winners ÷ (Winners + Unforced Errors + Double Faults). A dash means no qualifying outcomes yet.</dd></div>{eventGlossary.map((item) => <div key={item.code}><dt>{item.code} · {item.name}</dt><dd>{item.description}</dd></div>)}</dl></details>}
  </section>;
}
