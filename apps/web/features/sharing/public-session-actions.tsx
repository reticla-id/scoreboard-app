"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const REFRESH_COOLDOWN_MS = 10_000;

export function PublicSessionActions() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [coolingDown, setCoolingDown] = useState(false);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function refresh() {
    if (refreshing || coolingDown) return;
    setCoolingDown(true);
    timer.current = setTimeout(() => setCoolingDown(false), REFRESH_COOLDOWN_MS);
    startRefresh(() => router.refresh());
  }

  const label = refreshing ? "Refreshing…" : coolingDown ? "Refresh shortly" : "Refresh";

  return <div className="public-session-actions"><button className={`button button-secondary${refreshing ? " is-refreshing" : ""}`} type="button" disabled={refreshing || coolingDown} onClick={refresh} aria-label={coolingDown ? "Refresh available again shortly" : label}><svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 0-2 5" /></svg>{label}</button></div>;
}
