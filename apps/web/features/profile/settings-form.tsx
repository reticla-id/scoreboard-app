"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { MAX_AVATAR_BYTES } from "@/features/profile/avatar";
import { updateSettings } from "@/features/profile/settings-actions";

function SaveButton({ pending, changed }: { pending: boolean; changed: boolean }) {
  return <button className="button" type="submit" disabled={pending || !changed}>{pending ? "Saving…" : "Save changes"}</button>;
}

export function SettingsForm({ displayName, username, email, avatarSrc }: { displayName: string; username: string; email: string; avatarSrc: string | null }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [displayNameValue, setDisplayNameValue] = useState(displayName);
  const [usernameValue, setUsernameValue] = useState(username);
  const [savedDisplayName, setSavedDisplayName] = useState(displayName);
  const [savedUsername, setSavedUsername] = useState(username);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedAvatar, setSavedAvatar] = useState(avatarSrc);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const shownAvatar = removeAvatar ? null : preview ?? savedAvatar;
  const changed = displayNameValue !== savedDisplayName || usernameValue !== savedUsername || preview !== null || removeAvatar;
  return <form className="settings-form form-stack" aria-label="Profile settings" onChange={() => setMessage({})} onSubmit={(event) => {
    event.preventDefault();
    if (pending || !changed) return;
    const data = new FormData(event.currentTarget);
    setMessage({});
    startTransition(async () => {
      try {
        const result = await updateSettings({}, data);
        if (result.error) { setMessage({ error: result.error }); return; }
        setSavedAvatar(result.avatarSrc ?? null);
        const nextDisplayName = displayNameValue.trim();
        const nextUsername = usernameValue.trim().toLowerCase();
        setDisplayNameValue(nextDisplayName);
        setUsernameValue(nextUsername);
        setSavedDisplayName(nextDisplayName);
        setSavedUsername(nextUsername);
        setRemoveAvatar(false);
        setPreview(null);
        setFileError(null);
        if (fileInput.current) fileInput.current.value = "";
        setMessage({ success: result.success });
        router.refresh();
      } catch {
        setMessage({ error: "Could not save your profile. Try again." });
      }
    });
  }}>
    <div className="settings-avatar-row">
      {shownAvatar ? <Image className="settings-avatar" src={shownAvatar} alt="Current profile picture" width={76} height={76} unoptimized referrerPolicy="no-referrer" /> : <span className="settings-avatar settings-avatar-empty" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>}
      <div className="settings-avatar-actions"><span className="settings-field-title">Profile picture</span><div className="settings-avatar-buttons">
        <button className="settings-upload-button" type="button" onClick={() => fileInput.current?.click()}>{shownAvatar ? "Change picture" : "Add picture"}</button>
        {shownAvatar && <button className="settings-remove-button" type="button" onClick={() => { setRemoveAvatar(true); setPreview(null); if (fileInput.current) fileInput.current.value = ""; setFileError(null); setMessage({}); }}>Remove</button>}
      </div><span className="field-hint">PNG, JPG or WebP · up to 2 MB</span></div>
      <input ref={fileInput} hidden tabIndex={-1} id="settings-avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        if (file.size > MAX_AVATAR_BYTES) { setFileError("Choose an image under 2 MB."); event.currentTarget.value = ""; return; }
        setFileError(null); setRemoveAvatar(false); setPreview(URL.createObjectURL(file));
      }} />
      <input type="hidden" name="removeAvatar" value={removeAvatar ? "true" : "false"} />
    </div>
    <div className="settings-fields"><div><label htmlFor="settings-display-name">Display name</label><input id="settings-display-name" name="displayName" type="text" autoComplete="name" required maxLength={80} value={displayNameValue} onChange={(event) => setDisplayNameValue(event.target.value)} /></div>
      <div><label htmlFor="settings-email">Email</label><input className="settings-readonly" id="settings-email" type="email" value={email} readOnly aria-readonly="true" /></div>
      <div><label htmlFor="settings-username">Username</label><div className="input-prefix"><span aria-hidden="true">@</span><input id="settings-username" name="username" type="text" autoComplete="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" value={usernameValue} onChange={(event) => setUsernameValue(event.target.value)} /></div><p className="field-hint">3–30 letters, numbers, or underscores.</p></div></div>
    {(fileError || message.error) && <p className="message error" role="alert">{fileError ?? message.error}</p>}
    {message.success && !fileError && <p className="settings-save-status" role="status">{message.success}</p>}
    <div className="settings-save-row"><SaveButton pending={pending} changed={changed} /></div>
  </form>;
}
