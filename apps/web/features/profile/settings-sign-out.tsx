"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/features/auth/actions";

function SignOutButton() {
  const { pending } = useFormStatus();
  return <button className="button button-danger button-small" type="submit" disabled={pending}>{pending ? "Signing out…" : "Sign out this device"}</button>;
}

export function SettingsSignOut() {
  const dialog = useRef<HTMLDialogElement>(null);
  return <footer className="settings-sign-out">
    <div className="settings-sign-out-inner"><button className="settings-sign-out-button" type="button" onClick={() => dialog.current?.showModal()}>Sign out this device</button></div>
    <dialog className="finish-session-dialog settings-sign-out-dialog" ref={dialog} aria-labelledby="sign-out-title" onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="finish-session-confirm"><span className="panel-index">ACCOUNT</span><h3 id="sign-out-title">SIGN OUT?</h3><p>You’ll need to sign in again to access your sessions.</p><form action={signOut}><button className="button button-secondary button-small" type="button" autoFocus onClick={() => dialog.current?.close()}>Cancel</button><SignOutButton /></form></div>
    </dialog>
  </footer>;
}
