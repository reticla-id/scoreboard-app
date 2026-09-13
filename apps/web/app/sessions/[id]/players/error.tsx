"use client";

export default function Error({ reset }: { reset: () => void }) {
  return <main className="center-shell"><div className="panel stack"><h1>Roster unavailable.</h1><p className="muted">Check your connection and try again.</p><button className="button" onClick={reset}>Try again</button></div></main>;
}
