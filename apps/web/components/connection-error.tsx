"use client";

export function ConnectionError({ onRetry }: { onRetry?: () => void }) {
  return <main className="connection-error">
    <section aria-labelledby="connection-error-heading">
      <div className="connection-error-icon" aria-hidden="true"><svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 18c9-8 25-8 34 0M13 25c6-5 16-5 22 0M20 32c2-2 6-2 8 0" /><path d="M8 8l32 32" /></svg></div>
      <p className="eyebrow"><span className="dot" /> RETICLA</p>
      <h1 id="connection-error-heading">CONNECTION<br />PROBLEM.</h1>
      <p>We couldn&apos;t load the latest data. Check your connection and try again.</p>
      <button className="button" type="button" onClick={() => onRetry ? onRetry() : window.location.reload()}>Try again</button>
    </section>
  </main>;
}
