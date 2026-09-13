"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProfile, type ProfileState } from "@/features/profile/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="button button-full" type="submit" disabled={pending}>{pending ? "Saving…" : "Open home"}<span aria-hidden="true">↗</span></button>;
}

export function ProfileForm() {
  const [state, action] = useActionState<ProfileState, FormData>(createProfile, {});
  return <form action={action} className="stack form-stack">
    <label htmlFor="displayName">Display name</label><input id="displayName" name="displayName" type="text" autoComplete="name" required maxLength={80} placeholder="How should we call you?" />
    <label htmlFor="username">Username</label><div className="input-prefix"><span aria-hidden="true">@</span><input id="username" name="username" type="text" autoComplete="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" placeholder="yourname" aria-describedby="username-hint" /></div><p id="username-hint" className="field-hint">3–30 letters, numbers, or underscores.</p>
    <label htmlFor="avatarUrl">Avatar image URL <span className="optional">OPTIONAL</span></label><input id="avatarUrl" name="avatarUrl" type="url" inputMode="url" maxLength={500} placeholder="https://example.com/avatar.jpg" aria-describedby="avatar-hint" /><p id="avatar-hint" className="field-hint">Use an HTTPS image URL. You can leave this blank.</p>
    {state.error && <p className="message error" role="alert">{state.error}</p>}
    <SubmitButton />
  </form>;
}
