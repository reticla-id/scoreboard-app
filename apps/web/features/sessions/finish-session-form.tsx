"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { finishSession, type SessionFormState } from "./actions";

function FinishButton() {
  const { pending } = useFormStatus();
  return <button className="button button-danger button-small" type="submit" disabled={pending}>{pending ? "Finishing…" : "Finish Session"}</button>;
}

export function FinishSessionForm({ sessionId }: { sessionId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<SessionFormState, FormData>(finishSession.bind(null, sessionId), {});
  return <div className="finish-session-area"><button className="button" type="button" onClick={() => dialog.current?.showModal()}>Finish Session <span aria-hidden="true">→</span></button>
    <dialog className="finish-session-dialog" ref={dialog} aria-labelledby="finish-session-title" onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}><div className="finish-session-confirm"><h3 id="finish-session-title">FINISH THIS SESSION?</h3><p>Players and match generation will be locked. Scores can still be edited.</p><form action={action}><input type="hidden" name="confirm" value="yes" /><button className="button button-secondary button-small" type="button" onClick={() => dialog.current?.close()}>Cancel</button><FinishButton /></form>{state.error && <p className="message error" role="alert">{state.error}</p>}</div></dialog>
  </div>;
}
