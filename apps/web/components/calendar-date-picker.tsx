"use client";

import { useRef, useState } from "react";
import { dateFromInput, dateKey, todayKey } from "@/features/sessions/dates";

function monthStart(value: string) {
  const date = value ? dateFromInput(value) : dateFromInput(todayKey());
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function CalendarDatePicker({ value, onChange, name, label = "Date", optional = false }: { value: string; onChange: (value: string) => void; name?: string; label?: string; optional?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [month, setMonth] = useState(() => monthStart(value));
  const year = month.getUTCFullYear();
  const monthNumber = month.getUTCMonth();
  const offset = (month.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber + 1, 0)).getUTCDate();
  const display = value ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(dateFromInput(value)) : "Any date";
  const heading = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(month);
  return <div className="calendar-field">
    {name && <input type="hidden" name={name} value={value} />}
    <button className="calendar-trigger" type="button" aria-label={`${label}: ${display}. Choose date`} onClick={() => { setMonth(monthStart(value)); dialog.current?.showModal(); }}><span>{display}</span><span aria-hidden="true">▦</span></button>
    <dialog ref={dialog} className="calendar-dialog" aria-label={`Choose ${label.toLowerCase()}`} onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="calendar-top"><strong>{heading}</strong><button type="button" aria-label="Close calendar" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="calendar-controls"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(Date.UTC(year, monthNumber - 1, 1)))}>←</button><button type="button" onClick={() => setMonth(monthStart(todayKey()))}>Today</button><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(Date.UTC(year, monthNumber + 1, 1)))}>→</button></div>
      <div className="calendar-grid" role="group" aria-label={heading}>{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span className="calendar-weekday" key={index} aria-hidden="true">{day}</span>)}{Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: days }, (_, index) => {
        const day = index + 1;
        const key = dateKey(new Date(Date.UTC(year, monthNumber, day)));
        return <button key={key} className={key === value ? "calendar-selected" : key === todayKey() ? "calendar-today" : ""} type="button" aria-label={new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(dateFromInput(key))} aria-pressed={key === value} onClick={() => { onChange(key); dialog.current?.close(); }}>{day}</button>;
      })}</div>
      {optional && value && <button className="calendar-clear" type="button" onClick={() => { onChange(""); dialog.current?.close(); }}>Clear date</button>}
    </dialog>
  </div>;
}
