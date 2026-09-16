"use client";

import { useState, useTransition } from "react";
import { goLive, stopLive } from "./actions";

type LiveShare = { token: string; expiresAt: string } | null;

function invitation(name: string, sport: string, url: string, expiresAt: string) {
  const expiry = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(expiresAt));
  return `${name} · ${sport}\nFollow the matches and results: ${url}\nTemporary read-only link · expires ${expiry}`;
}

export function LiveSessionControl({ sessionId, sessionName, sport, matchCount, initialShare }: { sessionId: string; sessionName: string; sport: string; matchCount: number; initialShare: LiveShare }) {
  const [share, setShare] = useState(initialShare);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function activate() {
    setMessage("");
    startTransition(async () => {
      const result = await goLive(sessionId);
      if (result.error || !result.token || !result.expiresAt) { setMessage(result.error ?? "Could not create the live link."); return; }
      setShare({ token: result.token, expiresAt: result.expiresAt });
      setMessage("Live link ready for 6 hours.");
    });
  }

  function stop() {
    setMessage("");
    startTransition(async () => {
      const result = await stopLive(sessionId);
      if (result.error) { setMessage(result.error); return; }
      setShare(null);
      setMessage("Live session stopped.");
    });
  }

  async function copyInvitation() {
    if (!share) return;
    const url = `${window.location.origin}/live/${share.token}`;
    try {
      await navigator.clipboard.writeText(invitation(sessionName, sport, url, share.expiresAt));
      setMessage("Invitation copied.");
    } catch { setMessage("Could not copy the invitation. Open the live link and copy its URL instead."); }
  }

  return <section className="live-control" aria-labelledby="live-control-title">
    <div><span className="panel-index">LIVE SHARING</span><h2 id="live-control-title">{share ? "SESSION IS LIVE." : "GO LIVE."}</h2><p>{share ? `Live session expires: ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(share.expiresAt))}.` : "Share matches and results through a read-only link for 6 hours."}</p></div>
    <div className="live-control-actions">{share ? <><button className="button" type="button" disabled={pending} onClick={copyInvitation}>Copy invitation</button><a className="button button-secondary" href={`/live/${share.token}`} target="_blank" rel="noreferrer">Open live page</a><button className="text-link danger-text" type="button" disabled={pending} onClick={stop}>{pending ? "Stopping…" : "Stop live session"}</button></> : <button className="button" type="button" disabled={pending || matchCount < 1} onClick={activate}>{pending ? "Creating link…" : "Go Live"}</button>}</div>
    {!share && matchCount < 1 && <p className="live-control-hint">Generate at least one round before going live.</p>}
    {message && <p className="live-control-message" role="status">{message}</p>}
  </section>;
}
