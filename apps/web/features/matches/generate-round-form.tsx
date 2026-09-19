"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { generateRound, type GenerateState } from "./actions";
import { ArrowUpRightIcon } from "@/components/action-icons";

function GenerateButton({ number, enabled, context }: { number: number; enabled: boolean; context: "players" | "matches" }) {
  const { pending } = useFormStatus();
  return <button className="button" type="submit" disabled={pending || !enabled} aria-keyshortcuts={enabled ? "G" : undefined} title={enabled ? "Generate round (G)" : undefined}>{pending ? "Generating round…" : <>{context === "matches" ? "Generate Round" : `Generate Round ${number}`} <ArrowUpRightIcon /></>}</button>;
}

export function GenerateRoundForm({ sessionId, nextNumber, availability, locked = false, context = "players" }: { sessionId: string; nextNumber: number; availability: { enabled: boolean; message: string }; locked?: boolean; context?: "players" | "matches" }) {
  const [state, action] = useActionState<GenerateState, FormData>(generateRound.bind(null, sessionId), {});
  const formRef = useRef<HTMLFormElement>(null);
  const enabled = availability.enabled && !locked;
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!enabled || event.key.toLowerCase() !== "g" || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
  const description = locked ? "You no longer can edit finished session." : availability.message;
  return <section className={`generate-round-dock ${locked ? "generate-round-dock-locked" : ""} ${context === "matches" ? "next-round-cta" : ""}`} aria-label="Next step"><div>{context === "matches" ? <h3>Generate another round</h3> : <span className="panel-index">{locked ? "SESSION FINISHED" : enabled ? "ROSTER READY" : "PREPARE ROSTER"}</span>}<p>{context === "matches" ? "Create a new round using the current player list." : description}</p></div>{!locked && <form ref={formRef} action={action}><GenerateButton number={nextNumber} enabled={enabled} context={context} /></form>}{state.error && <p className="message error" role="alert">{state.error}</p>}</section>;
}
