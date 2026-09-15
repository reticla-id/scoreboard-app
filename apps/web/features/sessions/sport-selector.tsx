"use client";

import { useRef } from "react";
import { SPORT_OPTIONS, sportName, type AvailableSportCode } from "@/features/sports/catalog";

export function SportSelector({ value, onSelect }: { value: AvailableSportCode | null; onSelect: (code: AvailableSportCode) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return <div className="session-form-field">
    <span className="session-field-label">Sport</span>
    <button className="sport-selector-trigger" type="button" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
      <span className="sport-selector-icon" aria-hidden="true">{value ? "◉" : <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}</span><strong>{value ? sportName(value) : "Select sport"}</strong>
    </button>
    <dialog className="sport-dialog" ref={dialog} aria-labelledby="sport-dialog-title" onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="sport-dialog-head"><div><span className="panel-index">SESSION SPORT</span><h2 id="sport-dialog-title">CHOOSE A SPORT.</h2></div><button type="button" aria-label="Close sport selection" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="sport-option-grid">{SPORT_OPTIONS.map((sport) => <button key={sport.code} type="button" disabled={!sport.available} className={`sport-option ${value === sport.code ? "sport-option-selected" : ""}`} onClick={() => { if (sport.available) onSelect(sport.code); dialog.current?.close(); }} aria-label={sport.available ? `${sport.name}${value === sport.code ? ", selected" : ""}` : `${sport.name}, coming later`}>
        <span className="sport-option-icon" aria-hidden="true">{sport.icon}</span><strong>{sport.name}</strong><small>{sport.available ? "AVAILABLE" : "COMING LATER"}</small>
      </button>)}</div>
    </dialog>
  </div>;
}
