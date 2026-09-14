import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { requireWorkspace } from "@/lib/auth";
import { getHomeSessions } from "@/features/sessions/data";
import { SessionRows } from "@/features/sessions/session-card";
import { ArrowRightIcon, ArrowUpRightIcon } from "@/components/action-icons";
import { AppFooter } from "@/components/app-footer";

export const metadata: Metadata = { title: "Home" };

function ShortcutIcon({ kind }: { kind: "sessions" | "history" | "docs" | "settings" }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {kind === "sessions" && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18M8 15h3" /></>}
    {kind === "history" && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
    {kind === "docs" && <><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h4M9 12h6M9 16h6" /></>}
    {kind === "settings" && <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" fill="var(--background-secondary)" /><circle cx="16" cy="17" r="2" fill="var(--background-secondary)" /></>}
  </svg>;
}

export default async function HomePage() {
  const { id, profile } = await requireWorkspace();
  const [current, history] = await getHomeSessions(id);
  const firstName = profile.displayName.trim().split(/\s+/)[0];
  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <header className="home-greeting"><p className="eyebrow"><span className="dot" /> YOUR COURTSIDE SPACE</p><h1>WELCOME BACK, <span>{firstName.toUpperCase()}.</span></h1><p>Ready for your next session?</p></header>
    <div className="home-create"><Link className="button" href="/sessions/new">Host Session <ArrowUpRightIcon /></Link></div>
    <nav className="home-shortcuts" aria-label="Quick access"><Link href="/sessions"><ShortcutIcon kind="sessions" /><strong>Sessions</strong></Link><Link href="/history"><ShortcutIcon kind="history" /><strong>History</strong></Link><Link href="/docs"><ShortcutIcon kind="docs" /><strong>Docs</strong></Link><Link href="/settings"><ShortcutIcon kind="settings" /><strong>Settings</strong></Link></nav>
    <section className="home-preview" aria-labelledby="home-upcoming"><div className="home-preview-head"><div><span className="panel-index">YOUR COURT CALENDAR</span><h2 id="home-upcoming">ACTIVE & UPCOMING</h2></div><Link href="/sessions">View all <ArrowRightIcon /></Link></div><SessionRows sessions={current} view="current" emptyTitle="NO CURRENT SESSIONS" emptyText="Host a session to get everyone moving." /></section>
    <section className="home-preview home-preview-history" aria-labelledby="home-history"><div className="home-preview-head"><div><span className="panel-index">PREVIOUSLY</span><h2 id="home-history">HISTORY</h2></div><Link href="/history">View all <ArrowRightIcon /></Link></div><SessionRows sessions={history} view="history" emptyTitle="NO FINISHED SESSIONS" emptyText="Finished sessions will appear here." /></section>
    <AppFooter />
  </main>;
}
