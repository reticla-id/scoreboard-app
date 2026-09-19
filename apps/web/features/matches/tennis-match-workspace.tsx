"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRightIcon } from "@/components/action-icons";
import { RoundSelector } from "./round-selector";
import { GenerateRoundForm } from "./generate-round-form";
import { ResetMatchesForm } from "./reset-matches-form";
import { advanceMatch, changeTennisPoint, finishTennisMatch } from "./actions";
import { calculateTennisScore, tennisGameTotals, type TennisScore, type TennisSide } from "@/features/sports/tennis/scoring";
import type { RoundSummary } from "./match-workspace";

type Player = { id: string; name: string };
export type TennisMatchRow = { id: string; updatedAt: string; position: number; status: string; teamA: Player[]; teamB: Player[]; score: TennisScore };
export type TennisRoundView = RoundSummary & { matches: TennisMatchRow[] };

function teamName(players: Player[]) { return players.map((player) => player.name).join(" + "); }

function TennisMatch({ match, sessionId }: { match: TennisMatchRow; sessionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(match.status);
  const [score, setScore] = useState(match.score);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function start() {
    setError("");
    startTransition(async () => {
      const result = await advanceMatch(sessionId, match.id, "LIVE");
      if (result.error) { setError(result.error); router.refresh(); return; }
      setScore(calculateTennisScore({ points: [] }));
      setStatus("LIVE");
    });
  }

  function point(operation: TennisSide | "UNDO") {
    setError("");
    startTransition(async () => {
      const result = await changeTennisPoint(sessionId, match.id, operation);
      if (result.error || !result.scoreState) { setError(result.error ?? "The score could not be updated."); router.refresh(); return; }
      setScore(result.scoreState);
      setStatus(result.status ?? "LIVE");
    });
  }

  function finish() {
    setError("");
    startTransition(async () => {
      const result = await finishTennisMatch(sessionId, match.id);
      if (result.error || !result.scoreState) { setError(result.error ?? "The match could not be finished."); return; }
      setScore(result.scoreState);
      setStatus("FINISHED");
    });
  }

  const label = status === "LIVE" ? "Live" : status === "FINISHED" ? "Finished" : "Upcoming";
  const phase = score.phase === "TIEBREAK" ? "Tie-break" : score.phase === "DEUCE" ? "Deuce" : score.phase === "ADVANTAGE" ? "Advantage" : score.phase === "FINISHED" ? "Final" : "Current game";
  const gameTotals = tennisGameTotals(score);
  const finalScore = score.setsA + score.setsB > 0 ? `${score.setsA}-${score.setsB} sets` : `${gameTotals.gamesA}-${gameTotals.gamesB} games`;
  return <article className={`game-row tennis-match${status === "LIVE" ? " game-row-live" : ""}`}>
    <header className="game-row-label"><span>MATCH {String(match.position).padStart(2, "0")}</span><span className={`match-status match-${label.toLowerCase()}`}>{label}</span></header>
    <div className="tennis-scoreboard" aria-label={`Tennis score for match ${match.position}`}>
      <div className="tennis-score-head"><span>{phase}</span>{[0, 1, 2].map((set) => <span key={set}>SET {set + 1}</span>)}<span>POINTS</span></div>
      {(["A", "B"] as const).map((side) => <div className={`tennis-score-row${status === "FINISHED" && score.winner === side ? " tennis-score-winner" : ""}`} key={side}><strong>{teamName(side === "A" ? match.teamA : match.teamB)}</strong>{[0, 1, 2].map((set) => <span className="tennis-set-score" key={set}>{score.sets[set] ? (side === "A" ? score.sets[set].gamesA : score.sets[set].gamesB) : "—"}</span>)}<b className="tennis-point-score">{status === "UPCOMING" ? "—" : side === "A" ? score.pointA : score.pointB}</b></div>)}
    </div>
    {status === "UPCOMING" && <div className="game-row-action game-row-action-start"><button className="button button-small" type="button" disabled={pending} onClick={start}>Start match</button></div>}
    {status === "LIVE" && <div className="tennis-point-controls" aria-label="Tennis point controls"><button type="button" disabled={pending} onClick={() => point("A")}><span>TEAM A</span><strong>+ Point</strong></button><button type="button" disabled={pending} onClick={() => point("B")}><span>TEAM B</span><strong>+ Point</strong></button><button className="tennis-undo" type="button" disabled={pending || score.history.points.length === 0} onClick={() => point("UNDO")}>Undo last point</button><button className="tennis-finish" type="button" disabled={pending || score.history.points.length === 0} onClick={finish}>Finish match</button></div>}
    {status === "FINISHED" && <p className="tennis-final"><strong>{score.winner === "A" ? teamName(match.teamA) : teamName(match.teamB)}</strong> won · {finalScore}</p>}
    {error && <p className="message error game-feedback" role="alert">{error}</p>}
  </article>;
}

export function TennisMatchWorkspace({ sessionId, rounds, current, page, pages, completed = false }: { sessionId: string; rounds: RoundSummary[]; current: TennisRoundView | null; page: number; pages: number; completed?: boolean }) {
  const heading = <div className="games-heading"><div><h2>MATCHES.</h2></div></div>;
  if (!current) return <div className="games-workspace">{heading}<section className="games-empty"><h3>{completed ? "NO MATCHES RECORDED." : <>PLAYERS FIRST.<br />GAMES NEXT.</>}</h3><p className="muted">{completed ? "This session is finished. Its schedule is locked." : "Save players, then generate a Tennis round from Players."}</p><Link className="button" href={`/sessions/${sessionId}/players`}>View players <ArrowUpRightIcon /></Link></section></div>;
  const base = `/sessions/${sessionId}/matches?round=${current.number}`;
  return <div className="games-workspace">{heading}<RoundSelector rounds={rounds} selected={current} basePath={`/sessions/${sessionId}/matches`} /><section className="round-section" aria-label={`Round ${current.number} matches`}><div className="game-list">{current.matches.map((match) => <TennisMatch key={`${match.id}:${match.updatedAt}`} match={match} sessionId={sessionId} />)}</div>{!completed && page === pages && <GenerateRoundForm sessionId={sessionId} nextNumber={(rounds[0]?.number ?? current.number) + 1} availability={{ enabled: true, message: "" }} context="matches" />}{pages > 1 && <nav className="game-pagination" aria-label="Match pages"><span>Page {page} of {pages}</span><div>{page > 1 && <Link className="button button-secondary button-small" href={`${base}&page=${page - 1}`}>Previous</Link>}{page < pages && <Link className="button button-secondary button-small" href={`${base}&page=${page + 1}`}>Next</Link>}</div></nav>}</section>{!completed && <ResetMatchesForm sessionId={sessionId} />}</div>;
}
