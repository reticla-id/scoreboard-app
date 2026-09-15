"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/features/auth/actions";

function SignOutButton() {
  const { pending } = useFormStatus();
  return <button className="settings-sign-out-button" type="submit" disabled={pending}>{pending ? "Signing out…" : "Sign Out"}</button>;
}

export function SettingsSignOut() {
  return <footer className="settings-sign-out"><form action={signOut}><SignOutButton /></form></footer>;
}
