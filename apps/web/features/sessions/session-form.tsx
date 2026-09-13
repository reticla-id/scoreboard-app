"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarDatePicker } from "@/components/calendar-date-picker";
import type { SessionFormState } from "@/features/sessions/actions";
import { todayKey } from "@/features/sessions/dates";
import { SportSelector } from "@/features/sessions/sport-selector";
import { isAvailableSport, sportName, type AvailableSportCode } from "@/features/sports/catalog";

type Action = (state: SessionFormState, formData: FormData) => Promise<SessionFormState>;

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return <button className="button" disabled={pending} type="submit">{pending ? "Saving…" : mode === "create" ? "Host Session" : "Save changes"}<span aria-hidden="true">↗</span></button>;
}

export function SessionForm({ action, mode, values }: { action: Action; mode: "create" | "edit"; values?: { name: string; date: string; startTime: string | null; location: string; sport: string } }) {
  const [state, formAction] = useActionState<SessionFormState, FormData>(action, {});
  const [date, setDate] = useState(values?.date ?? todayKey());
  const [sport, setSport] = useState<AvailableSportCode | null>(null);
  const [clientError, setClientError] = useState("");
  useEffect(() => {
    if (mode !== "create") return;
    const now = new Date();
    const localDate = todayKey(new Date(now.getTime() - now.getTimezoneOffset() * 60_000));
    const frame = requestAnimationFrame(() => setDate(localDate));
    return () => cancelAnimationFrame(frame);
  }, [mode]);
  return <div className="session-form stack">
    {mode === "create" && <SportSelector value={sport} onSelect={(value) => { setSport(value); setClientError(""); }} />}
    {mode === "create" && !sport ? <p className="muted sport-select-hint">Select a sport to set up your session.</p> : <form action={formAction} className="session-form stack" onSubmit={(event) => { if (mode === "create" && !isAvailableSport(sport)) { event.preventDefault(); setClientError("Select a sport before creating the session."); } }}>
    {mode === "create" && <input type="hidden" name="sport" value={sport ?? ""} />}
    <div className="session-form-field"><label htmlFor="session-name">Session Name</label><input id="session-name" name="name" type="text" required maxLength={120} autoFocus placeholder="Friday night padel" defaultValue={values?.name} /></div>
    {mode === "edit" && <div className="session-form-field"><span className="session-field-label">Sport</span><div className="fixed-sport" aria-label={`Sport: ${sportName(values?.sport ?? "")}, locked after creation`}>{sportName(values?.sport ?? "")} <span>LOCKED</span></div></div>}
    <div className="session-form-grid"><div className="session-form-field"><span className="session-field-label">Date</span><CalendarDatePicker value={date} onChange={setDate} name="date" /></div>
    <div className="session-form-field"><label htmlFor="session-time">Time</label><input id="session-time" name="startTime" type="time" required defaultValue={values?.startTime ?? (mode === "create" ? "19:00" : "")} /></div></div>
    <details className="optional-detail" open={!!values?.location}><summary>+ Add location <span>optional</span></summary><div className="session-form-field"><label className="sr-only" htmlFor="session-location">Location</label><input id="session-location" name="location" type="text" maxLength={120} placeholder="Court or venue" defaultValue={values?.location} /></div></details>
    {(clientError || state.error) && <p className="message error" role="alert">{clientError || state.error}</p>}
    <div className="session-form-actions"><SubmitButton mode={mode} /></div>
    </form>}
  </div>;
}
