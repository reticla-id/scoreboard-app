"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { advanceMatch, changeScore, recordMatchEvent, resetScore, saveFinishedScore } from "./actions";
import { EVENT_TYPES, changeDisplayedScore, projectScore, type EventType, type Score, type ScoreOperation, type TeamSide } from "./scoring";
import { ResetMatchesForm } from "./reset-matches-form";
import { ArrowUpRightIcon } from "@/components/action-icons";
import { RoundSelector } from "./round-selector";
import { GenerateRoundForm } from "./generate-round-form";

type MatchPlayer = { id: string; name: string };
type EventCount = { playerId: string; type: string; count: number };
export type MatchRow = { id: string; updatedAt: string; position: number; status: string; scoreA: number | null; scoreB: number | null; teamA: [MatchPlayer, MatchPlayer]; teamB: [MatchPlayer, MatchPlayer]; eventCounts: EventCount[] };
export type RoundSummary = { id: string; number: number; matchCount: number };
export type RoundView = RoundSummary & { waiting: string[]; matches: MatchRow[] };
type PlayerStats = Record<string, Record<EventType, number>>;
type EventGlossary = readonly { code: EventType; name: string; description: string }[];

function initialStats(match: MatchRow): PlayerStats {
  const stats: PlayerStats = {};
  for (const player of [...match.teamA, ...match.teamB]) stats[player.id] = { W: 0, FE: 0, UE: 0, DF: 0 };
  for (const count of match.eventCounts) if (stats[count.playerId] && EVENT_TYPES.includes(count.type as EventType)) stats[count.playerId][count.type as EventType] = count.count;
  return stats;
}

function projectStats(base: PlayerStats, operations: ScoreOperation[]): PlayerStats {
  const stats = Object.fromEntries(Object.entries(base).map(([id, values]) => [id, { ...values }])) as PlayerStats;
  for (const operation of operations) {
    if (operation.kind === "reset") for (const values of Object.values(stats)) for (const type of EVENT_TYPES) values[type] = 0;
    if (operation.kind === "event" && stats[operation.playerId]) stats[operation.playerId][operation.type]++;
  }
  return stats;
}

function ScoreCounter({ side, value, onChange, disabled = false }: { side: TeamSide; value: number; onChange: (delta: -1 | 1) => void; disabled?: boolean }) {
  return <div className="score-counter" aria-label={`Team ${side} score`}>
    <button type="button" aria-label={`Subtract one from Team ${side}`} disabled={disabled || value === 0} onClick={() => onChange(-1)}>−</button>
    <strong>{value}</strong>
    <button type="button" aria-label={`Add one to Team ${side}`} disabled={disabled || value === 99} onClick={() => onChange(1)}>+</button>
  </div>;
}

function MatchLine({ match, sessionId, onGlossary, eventGlossary }: { match: MatchRow; sessionId: string; onGlossary: () => void; eventGlossary: EventGlossary }) {
  const router = useRouter();
  const [status, setStatus] = useState(match.status);
  const [score, setScore] = useState<Score>({ a: match.scoreA ?? 0, b: match.scoreB ?? 0 });
  const [draft, setDraft] = useState<Score | null>(null);
  const [stats, setStats] = useState(() => initialStats(match));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const authoritativeScore = useRef<Score>({ a: match.scoreA ?? 0, b: match.scoreB ?? 0 });
  const savedScore = useRef<{ a: number | null; b: number | null }>({ a: match.scoreA, b: match.scoreB });
  const authoritativeStats = useRef(initialStats(match));
  const pending = useRef<ScoreOperation[]>([]);
  const draining = useRef(false);
  const actionBusy = useRef(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  function project() {
    setScore(projectScore(authoritativeScore.current, pending.current));
    setStats(projectStats(authoritativeStats.current, pending.current));
    setPendingCount(pending.current.length);
  }

  async function drain() {
    if (draining.current) return;
    draining.current = true;
    while (pending.current.length) {
      const operation = pending.current[0];
      try {
        const result = operation.kind === "reset" ? await resetScore(sessionId, match.id)
          : operation.kind === "change" ? await changeScore(sessionId, match.id, operation.side, operation.delta)
            : await recordMatchEvent(sessionId, match.id, operation.playerId, operation.type);
        if (result.error || result.scoreA === undefined || result.scoreB === undefined) throw new Error(result.error ?? "The score could not be saved.");
        authoritativeScore.current = { a: result.scoreA, b: result.scoreB };
        authoritativeStats.current = projectStats(authoritativeStats.current, [operation]);
        pending.current.shift();
        project();
        if (operation.kind === "event") {
          setFlash(true);
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlash(false), 180);
        }
      } catch (cause) {
        pending.current = [];
        project();
        setError(cause instanceof Error ? cause.message : "The score could not be saved.");
        router.refresh();
        break;
      }
    }
    draining.current = false;
  }

  function queue(operation: ScoreOperation) {
    if (status !== "LIVE" || actionBusy.current) return;
    const before = projectScore(authoritativeScore.current, pending.current);
    const projected = projectScore(before, [operation]);
    if (operation.kind === "event" && projected.a === before.a && projected.b === before.b) return;
    pending.current.push(operation);
    setError(""); setNotice("");
    project();
    if (operation.kind === "event") setSelectedPlayer(null);
    startTransition(async () => { await drain(); });
  }

  function advance(next: "LIVE" | "FINISHED") {
    if (actionBusy.current || pending.current.length) return;
    if (next === "FINISHED" && score.a === score.b) { setError("Scores must differ before finishing."); return; }
    actionBusy.current = true;
    setError(""); setNotice("");
    startTransition(async () => {
      try {
        const result = await advanceMatch(sessionId, match.id, next);
        if (result.error) throw new Error(result.error);
        authoritativeScore.current = { a: result.scoreA ?? 0, b: result.scoreB ?? 0 };
        setScore(authoritativeScore.current);
        setStatus(next);
        setNotice(result.success ?? "Match updated.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Match could not be updated.");
        router.refresh();
      } finally { actionBusy.current = false; }
    });
  }

  function saveDraft() {
    if (!draft || actionBusy.current) return;
    if (draft.a === draft.b) { setError("Final scores must differ."); return; }
    actionBusy.current = true;
    setError("");
    startTransition(async () => {
      try {
        const result = await saveFinishedScore(sessionId, match.id, draft.a, draft.b, savedScore.current.a, savedScore.current.b);
        if (result.error) throw new Error(result.error);
        authoritativeScore.current = { a: result.scoreA ?? draft.a, b: result.scoreB ?? draft.b };
        savedScore.current = { a: authoritativeScore.current.a, b: authoritativeScore.current.b };
        setScore(authoritativeScore.current);
        setDraft(null);
        setNotice("Final score saved.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Final score could not be saved.");
        router.refresh();
      } finally { actionBusy.current = false; }
    });
  }

  const players = [...match.teamA, ...match.teamB];
  const selected = players.find((player) => player.id === selectedPlayer);
  const selectedSide = selected && match.teamA.some((player) => player.id === selected.id) ? "A" : "B";
  const visibleScore = draft ?? score;
  const showScore = draft !== null || status === "LIVE" || match.scoreA !== null || score.a > 0 || score.b > 0;
  const hasTrackedEvents = Object.values(stats).some((values) => EVENT_TYPES.some((type) => values[type] > 0));
  const label = status === "LIVE" ? "Live" : status === "FINISHED" ? "Finished" : "Upcoming";

  return <article className={`game-row ${status === "LIVE" ? "game-row-live" : ""} ${flash ? "game-row-flash" : ""}`}>
    <header className="game-row-label"><span>MATCH {String(match.position).padStart(2, "0")}</span><span className={`match-status match-${label.toLowerCase()}`}>{label}</span></header>
    <div className="game-row-play">
      <div className="game-score"><span>SCORE</span><strong aria-live="polite" aria-atomic="true" aria-label={showScore ? `Team A ${visibleScore.a}, Team B ${visibleScore.b}` : "Score not entered"}>{showScore ? `${visibleScore.a}-${visibleScore.b}` : "-"}</strong></div>
      <div className={`game-team game-team-a ${status === "FINISHED" && visibleScore.a > visibleScore.b ? "game-winner" : ""}`}><span>TEAM A</span><strong>{match.teamA.map((player) => <span key={player.id}>{player.name}</span>)}</strong></div>
      <div className={`game-team game-team-b ${status === "FINISHED" && visibleScore.b > visibleScore.a ? "game-winner" : ""}`}><span>TEAM B</span><strong>{match.teamB.map((player) => <span key={player.id}>{player.name}</span>)}</strong></div>
    </div>
    {status === "UPCOMING" && <div className="game-row-action game-row-action-start"><button className="button button-small" type="button" disabled={busy} onClick={() => advance("LIVE")}>Start match</button></div>}
    {status === "LIVE" && <div className="score-entry" aria-label={`Score controls for match ${match.position}`}>
      <div className="score-lanes"><div className="score-lane"><span>TEAM A</span><ScoreCounter side="A" value={score.a} onChange={(delta) => queue({ kind: "change", side: "A", delta })} /></div><div className="score-lane"><span>TEAM B</span><ScoreCounter side="B" value={score.b} onChange={(delta) => queue({ kind: "change", side: "B", delta })} /></div></div>
      <div className="score-actions">{(score.a > 0 || score.b > 0 || hasTrackedEvents) && <button className="text-link" type="button" onClick={() => queue({ kind: "reset" })}>{hasTrackedEvents ? "Reset score & points" : "Reset score"}</button>}<button className="button button-small" type="button" disabled={pendingCount > 0 || busy} onClick={() => advance("FINISHED")}>Finish match <ArrowUpRightIcon /></button></div>
    </div>}
    {status === "FINISHED" && <div className="game-row-action">{draft ? <div className="finished-edit"><div className="score-lanes"><div className="score-lane"><span>TEAM A</span><ScoreCounter side="A" value={draft.a} disabled={busy} onChange={(delta) => setDraft((current) => current && changeDisplayedScore(current, "A", delta))} /></div><div className="score-lane"><span>TEAM B</span><ScoreCounter side="B" value={draft.b} disabled={busy} onChange={(delta) => setDraft((current) => current && changeDisplayedScore(current, "B", delta))} /></div></div><div className="score-actions"><button className="text-link" type="button" disabled={busy} onClick={() => { setDraft(null); setError(""); }}>Cancel</button><button className="button button-small" type="button" disabled={busy} onClick={saveDraft}>Save score</button></div></div> : <button className="text-link" type="button" onClick={() => { setDraft({ ...score }); setError(""); }}>Edit score</button>}</div>}
    {status !== "UPCOMING" && <div className="advanced-tracker"><div className="tracker-header"><button className="tracker-toggle" type="button" aria-expanded={advancedOpen} aria-controls={`tracker-${match.id}`} onClick={() => { setAdvancedOpen((value) => !value); setSelectedPlayer(null); }}>Advanced tracking <span aria-hidden="true">{advancedOpen ? "−" : "+"}</span></button></div>
      {advancedOpen && <div id={`tracker-${match.id}`} className="tracker-content"><div className="tracker-description"><p>{status === "LIVE" ? "Choose a player, then a point outcome." : "Recorded player outcomes for this match."}</p><button className="tracker-info" type="button" aria-label="Open advanced tracking quick reference" onClick={onGlossary}>i</button></div><div className="tracker-players">{players.map((player) => <button key={player.id} type="button" disabled={status !== "LIVE"} aria-pressed={selectedPlayer === player.id} onClick={() => setSelectedPlayer(player.id)}><span>{player.name}</span><small>{eventGlossary.map((event) => `${event.code} ${stats[player.id]?.[event.code] ?? 0}`).join(" · ")}</small></button>)}</div>
        {selected && status === "LIVE" && <div className="tracker-outcomes" aria-label={`Point outcome for ${selected.name}`}><span>{selected.name}</span><div>{eventGlossary.map((event) => <button key={event.code} type="button" aria-label={`${selected.name}: ${event.name}`} onClick={() => queue({ kind: "event", playerId: selected.id, playerSide: selectedSide, type: event.code })}>{event.code}</button>)}</div></div>}</div>}
    </div>}
    {error && <p className="message error game-feedback" role="alert">{error}</p>}{notice && <p className="message success game-feedback" role="status">{notice}</p>}
  </article>;
}

export function MatchWorkspace({ sessionId, rounds, current, page, pages, minimumPlayers, eventGlossary, completed = false }: { sessionId: string; rounds: RoundSummary[]; current: RoundView | null; page: number; pages: number; minimumPlayers: number; eventGlossary: EventGlossary; completed?: boolean }) {
  const glossaryRef = useRef<HTMLDialogElement>(null);
  const heading = <div className="games-heading"><div><h2>MATCHES.</h2></div></div>;
  if (!current) return <div className="games-workspace">{heading}<section className="games-empty"><h3>{completed ? "NO MATCHES RECORDED." : <>PLAYERS FIRST.<br />GAMES NEXT.</>}</h3><p className="muted">{completed ? "This session is finished. Its schedule is locked." : `Save at least ${minimumPlayers} players, then generate a doubles round from Players.`}</p><Link className="button" href={`/sessions/${sessionId}/players`}>View players <ArrowUpRightIcon /></Link></section></div>;
  const base = `/sessions/${sessionId}/matches?round=${current.number}`;
  return <div className="games-workspace">{heading}
    <RoundSelector rounds={rounds} selected={current} basePath={`/sessions/${sessionId}/matches`} />
    <section className="round-section" id={`round-${current.number}`} aria-label={`Round ${current.number} matches`}>
      <div className="game-list">{current.matches.map((match) => <MatchLine key={`${match.id}:${match.updatedAt}`} match={match} sessionId={sessionId} eventGlossary={eventGlossary} onGlossary={() => glossaryRef.current?.showModal()} />)}</div>
      {!completed && page === pages && <GenerateRoundForm sessionId={sessionId} nextNumber={(rounds[0]?.number ?? current.number) + 1} availability={{ enabled: true, message: "" }} context="matches" />}
      {pages > 1 && <nav className="game-pagination" aria-label="Match pages"><span>Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, current.matchCount)} of {current.matchCount.toLocaleString("en-US")}</span><div>{page > 1 && <Link className="button button-secondary button-small" href={`${base}&page=${page - 1}`}>Previous</Link>}{page < pages && <Link className="button button-secondary button-small" href={`${base}&page=${page + 1}`}>Next</Link>}</div></nav>}
      {current.waiting.length > 0 && <div className="round-waiting"><strong>WAITING THIS ROUND</strong><span>{current.waiting.join(" · ")}</span></div>}
    </section>
    {!completed && <ResetMatchesForm sessionId={sessionId} />}
    <dialog className="tracker-glossary" ref={glossaryRef} aria-labelledby="tracker-glossary-title" onClick={(event) => { if (event.target === glossaryRef.current) glossaryRef.current.close(); }}><div className="tracker-glossary-top"><div><span className="panel-index">QUICK REFERENCE</span><h3 id="tracker-glossary-title">TRACKING TERMS.</h3></div><form method="dialog"><button type="submit" aria-label="Close glossary" autoFocus>Close</button></form></div><dl>{eventGlossary.map((item) => <div key={item.code}><dt>{item.name} <span>{item.code}</span></dt><dd>{item.description}</dd></div>)}</dl></dialog>
  </div>;
}
