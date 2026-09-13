"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/features/auth/actions";
import { useDismissiblePopover } from "@/hooks/use-dismissible-popover";

function Avatar({ name, src }: { name: string; src: string | null }) {
  return src
    ? <Image className="user-badge" src={src} alt="" width={36} height={36} unoptimized referrerPolicy="no-referrer" />
    : <span className="user-badge" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return <button className="profile-menu-item" type="submit" disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>;
}

export function ProfileMenu({ name, avatarSrc }: { name: string; avatarSrc: string | null }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismissiblePopover(open, root, () => setOpen(false));

  return <div className="profile-menu-root" ref={root}>
    <button className="profile-trigger" type="button" aria-label={`Open account menu for ${name}`} aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen((value) => !value)}>
      <Avatar name={name} src={avatarSrc} />
    </button>
    {open && <div id="account-menu" className="profile-menu-panel">
      <div className="profile-menu-identity"><Avatar name={name} src={avatarSrc} /><strong>{name}</strong></div>
      <Link className="profile-menu-item" href="/settings" onClick={() => setOpen(false)}>Settings</Link>
      <form action={signOut}><SignOutButton /></form>
    </div>}
  </div>;
}
