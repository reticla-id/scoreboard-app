"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { addPlayer, editPlayer, removePlayer } from "./actions";
import { ImportPanel } from "./import-panel";
import { playerNameKey } from "./validation";
import { useDismissiblePopover } from "@/hooks/use-dismissible-popover";
import { ArrowUpRightIcon } from "@/components/action-icons";

export type RosterPlayer = { id: string; name: string };
type EntryMode = "closed" | "manual" | "import";

function SaveButton({ label, icon = false }: { label: string; icon?: boolean }) {
  const { pending } = useFormStatus();
  return <button className="button button-small" type="submit" disabled={pending}>{pending ? "Saving…" : label}{icon && !pending && <ArrowUpRightIcon />}</button>;
}

function PlayerRow({ player, sessionId, readOnly }: { player: RosterPlayer; sessionId: string; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  useDismissiblePopover(menuOpen, menu, () => { if (menu.current) menu.current.open = false; setMenuOpen(false); });
  const [editState, editAction] = useActionState(async (state: { error?: string; success?: string }, formData: FormData) => {
    const result = await editPlayer(sessionId, player.id, state, formData);
    if (result.success) setEditing(false);
    return result;
  }, {});
  const [deleteState, deleteAction] = useActionState(removePlayer.bind(null, sessionId, player.id), {});
  return <li className="player-row">
    <span className="player-marker" aria-hidden="true">●</span>
    {!readOnly && editing ? <form action={editAction} className="player-row-form">
      <label className="sr-only" htmlFor={`edit-${player.id}`}>Edit {player.name}</label>
      <input id={`edit-${player.id}`} name="name" defaultValue={player.name} maxLength={80} required autoFocus />
      <SaveButton label="Save" />
      <button type="button" className="button button-secondary button-small" onClick={() => setEditing(false)}>Cancel</button>
      {editState.error && <p className="message error" role="alert">{editState.error}</p>}
    </form> : !readOnly && confirming ? <form action={deleteAction} className="player-row-form">
      <span className="player-row-name">Remove {player.name} from the roster?</span><input name="confirm" type="hidden" value="yes" />
      <SaveButton label="Remove" /><button type="button" className="button button-secondary button-small" onClick={() => setConfirming(false)}>Cancel</button>
      {deleteState.error && <p className="message error" role="alert">{deleteState.error}</p>}
    </form> : <><span className="player-row-name">{player.name}</span>{!readOnly && <details className="player-row-menu" ref={menu} onToggle={(event) => setMenuOpen(event.currentTarget.open)}><summary aria-label={`Actions for ${player.name}`}>⋯</summary><div><button type="button" onClick={() => { setMenuOpen(false); setEditing(true); }}>Edit</button><button type="button" className="danger-text" onClick={() => { setMenuOpen(false); setConfirming(true); }}>Remove</button></div></details>}</>}
  </li>;
}

export function Roster({ players, sessionId, minimumPlayers, sportName, readOnly = false, lockReason }: { players: RosterPlayer[]; sessionId: string; minimumPlayers: number; sportName: string; readOnly?: boolean; lockReason?: string }) {
  const [mode, setMode] = useState<EntryMode>("closed");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [state, action] = useActionState(addPlayer.bind(null, sessionId), {});
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state.revision) { formRef.current?.reset(); inputRef.current?.focus(); } }, [state.revision]);
  const filtered = players.filter((player) => playerNameKey(player.name).includes(playerNameKey(query)));
  return <section className="roster-workspace" aria-labelledby="roster-heading">
    {players.length > 0 && <div className="roster-topline"><div><p className="panel-index">{readOnly ? "ROSTER / READ ONLY" : "SAVED ROSTER"}</p><h3 id="roster-heading">{players.length} PLAYER{players.length === 1 ? "" : "S"}</h3>{lockReason && <p className="muted roster-lock-note">{lockReason}</p>}</div>{!readOnly && mode === "closed" && <div className="roster-entry-actions"><button className="button button-secondary button-small" type="button" onClick={() => setMode("manual")}>+ Add players</button><button className="text-link" type="button" onClick={() => setMode("import")}>Import list</button></div>}</div>}
    {players.length === 0 && <div className="roster-simple-empty"><h3 id="roster-heading">{readOnly ? "NO PLAYERS RECORDED." : "WHO’S PLAYING TODAY?"}</h3><p className="muted">{readOnly ? lockReason ?? "This session is finished, so its roster is locked." : `${minimumPlayers} players make the first ${sportName.toLowerCase()} match.`}</p>{!readOnly && mode === "closed" && <div className="roster-empty-actions"><button className="button" type="button" onClick={() => setMode("manual")}>Add players <ArrowUpRightIcon /></button><button className="button button-secondary" type="button" onClick={() => setMode("import")}>Import list</button></div>}</div>}
    {!readOnly && mode === "manual" && <div className="entry-reveal"><div className="entry-reveal-head"><h4>ADD PLAYERS</h4><button className="text-link" type="button" onClick={() => setMode("closed")}>Done</button></div><form action={action} ref={formRef} className="quick-add-form"><div className="session-form-field"><label htmlFor="player-name">Player name</label><input ref={inputRef} id="player-name" name="name" type="text" maxLength={80} required autoFocus placeholder="Type a name" autoComplete="off" /></div><SaveButton label="Add" icon /></form><p className="field-note">Press Enter to add the next player.</p>{state.error && <p className="message error" role="alert">{state.error}</p>}{state.success && <p className="message success" role="status">{state.success}</p>}</div>}
    {!readOnly && mode === "import" && <div className="entry-reveal"><div className="entry-reveal-head"><h4>IMPORT LIST</h4><button className="text-link" type="button" onClick={() => setMode("closed")}>Done</button></div><ImportPanel sessionId={sessionId} players={players} /></div>}
    {players.length > 0 && <><div className="roster-list-head"><span className="panel-index">NAMES</span>{players.length >= 8 && !searchOpen && <button className="text-link" type="button" onClick={() => setSearchOpen(true)}>Search</button>}</div>{searchOpen && <div className="session-form-field roster-search"><label className="sr-only" htmlFor="player-search">Search players</label><input id="player-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this roster" autoFocus /></div>}{filtered.length ? <ul className="player-list">{filtered.map((player) => <PlayerRow key={player.id} player={player} sessionId={sessionId} readOnly={readOnly} />)}</ul> : <p className="muted roster-no-match">No players match “{query}”.</p>}</>}
  </section>;
}
