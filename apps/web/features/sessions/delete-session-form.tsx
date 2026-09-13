"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { SessionFormState } from "@/features/sessions/actions";

function DeleteButton() {
  const { pending } = useFormStatus();
  return <button className="button button-danger" type="submit" disabled={pending}>{pending ? "Deleting…" : "Delete session"}</button>;
}

export function DeleteSessionForm({ action }: { action: (state: SessionFormState, formData: FormData) => Promise<SessionFormState> }) {
  const [state, formAction] = useActionState<SessionFormState, FormData>(action, {});
  return <form action={formAction} className="delete-form stack">
    <label className="confirm-line"><input type="checkbox" name="confirm" value="yes" required /><span>I understand this permanently deletes the session.</span></label>
    {state.error && <p className="message error" role="alert">{state.error}</p>}
    <DeleteButton />
  </form>;
}
