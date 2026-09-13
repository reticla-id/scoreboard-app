"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { resetMatches, type GenerateState } from "./actions";

function ResetButton() {
  const { pending } = useFormStatus();
  return <button className="button button-danger button-small" type="submit" disabled={pending}>{pending ? "Resetting…" : "Reset Matches"}</button>;
}

export function ResetMatchesForm({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<GenerateState, FormData>(resetMatches.bind(null, sessionId), {});
  return <section className="reset-matches" aria-label="Reset generated matches">
    {!open ? <button className="text-link danger-text" type="button" onClick={() => setOpen(true)}>Reset matches</button> : <div className="reset-confirm"><div><h3>RESET ALL MATCHES?</h3><p>This removes all generated rounds, matches, and their results. Your players will remain.</p></div><form action={action}><input name="confirm" type="hidden" value="yes" /><button className="button button-secondary button-small" type="button" onClick={() => setOpen(false)}>Cancel</button><ResetButton /></form>{state.error && <p className="message error" role="alert">{state.error}</p>}</div>}
  </section>;
}
