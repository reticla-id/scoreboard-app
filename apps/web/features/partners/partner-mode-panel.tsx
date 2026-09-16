"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { changeFixedPair, setPartnerMode } from "./actions";
import type { FixedPair, PartnerMode } from "@/features/sports/padel/partner-modes";

type Player = { id: string; name: string };

export function PartnerModePanel({ sessionId, players, mode, pairs, locked, hasRounds, completed }: { sessionId: string; players: Player[]; mode: PartnerMode; pairs: FixedPair[]; locked: boolean; hasRounds: boolean; completed: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const names = new Map(players.map((player) => [player.id, player.name]));
  const assigned = new Set(pairs.flatMap((pair) => [pair.firstId, pair.secondId]));
  const unpaired = players.filter((player) => !assigned.has(player.id));
  const next = unpaired[0];

  function changeMode(nextMode: PartnerMode) {
    if (locked || pending || nextMode === mode) return;
    setError(""); setNotice(""); setChoosing(false);
    startTransition(async () => {
      try {
        const result = await setPartnerMode(sessionId, nextMode);
        if (result.error) setError(result.error);
        else { setNotice(result.success ?? "Partner mode saved."); router.refresh(); }
      } catch { setError("Could not save partner mode. Try again."); }
    });
  }

  function changePair(firstId: string, secondId: string | null) {
    if (locked || pending) return;
    setError(""); setNotice("");
    startTransition(async () => {
      try {
        const result = await changeFixedPair(sessionId, firstId, secondId);
        if (result.error) setError(result.error);
        else { setChoosing(false); setNotice(result.success ?? "Partners saved."); router.refresh(); }
      } catch { setError("Could not save partners. Try again."); }
    });
  }

  return <section className="partner-mode-section" aria-labelledby="partner-mode-heading">
    <div className="partner-mode-heading"><span className="panel-index">SETUP / 02</span><h3 id="partner-mode-heading">PARTNERS.</h3></div>
    <div className="partner-mode-switch" role="group" aria-label="Partner mode">
      <button type="button" aria-pressed={mode === "RANDOM"} disabled={locked || pending} onClick={() => changeMode("RANDOM")}><strong>Random Partners</strong><small>Different teammates across matches</small></button>
      <button type="button" aria-pressed={mode === "FIXED"} disabled={locked || pending} onClick={() => changeMode("FIXED")}><strong>Fixed Partners</strong><small>Keep your partner every match</small></button>
    </div>
    {locked && <p className="muted partner-mode-note">{completed ? "Partner setup is locked." : hasRounds ? <>Reset Matches before changing partner mode or assignments. Existing matches stay intact. <Link href={`/sessions/${sessionId}/matches`}>Open Matches →</Link></> : null}</p>}
    {mode === "FIXED" && <div className="fixed-pair-area">
      <div className="fixed-pair-count"><strong>{pairs.length} PAIR{pairs.length === 1 ? "" : "S"}</strong><span>{unpaired.length} unpaired</span></div>
      {pairs.length > 0 && <ul className="fixed-pair-list">{pairs.map((pair) => <li key={`${pair.firstId}:${pair.secondId}`}><span>{names.get(pair.firstId) ?? "Former player"} <b>+</b> {names.get(pair.secondId) ?? "Former player"}</span>{!locked && <button type="button" disabled={pending} onClick={() => changePair(pair.firstId, null)}>Unpair</button>}</li>)}</ul>}
      {!locked && next && <div className="fixed-pair-next"><span className="panel-index">NEXT PLAYER</span><strong>{next.name}</strong>{unpaired.length < 2 ? <span className="muted">Needs one more player</span> : !choosing ? <button className="button button-secondary button-small" type="button" onClick={() => setChoosing(true)}>Choose partner <span aria-hidden="true">→</span></button> : <div className="fixed-pair-choices" role="group" aria-label={`Choose a partner for ${next.name}`}>{unpaired.slice(1).map((player) => <button key={player.id} type="button" disabled={pending} onClick={() => changePair(next.id, player.id)}>{player.name}</button>)}<button className="fixed-pair-cancel" type="button" onClick={() => setChoosing(false)}>Cancel</button></div>}</div>}
      {!locked && players.length % 2 === 1 && <p className="muted partner-mode-note">Add or remove one player to complete the pairs.</p>}
    </div>}
    {pending && <p className="muted partner-mode-note" role="status">Saving partners…</p>}
    {error && <p className="message error" role="alert">{error}</p>}
    {notice && !pending && <p className="message success" role="status">{notice}</p>}
  </section>;
}
