import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { requireWorkspace } from "@/lib/auth";
import { getHomeSessions } from "@/features/sessions/data";
import { SessionRows } from "@/features/sessions/session-card";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const { id, profile } = await requireWorkspace();
  const [current, history] = await getHomeSessions(id);
  const firstName = profile.displayName.trim().split(/\s+/)[0];
  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <header className="home-greeting"><p className="eyebrow"><span className="dot" /> YOUR COURTSIDE SPACE</p><h1>WELCOME BACK, <span>{firstName.toUpperCase()}.</span></h1><p>Ready for your next session?</p></header>
    <nav className="home-shortcuts" aria-label="Quick access"><Link href="/sessions"><span>01</span><strong>Sessions</strong><span aria-hidden="true">↗</span></Link><Link href="/history"><span>02</span><strong>History</strong><span aria-hidden="true">↗</span></Link><Link href={current[0] ? `/sessions/${current[0].id}/players` : "/sessions"}><span>03</span><strong>Players</strong><span aria-hidden="true">↗</span></Link><Link href="/settings"><span>04</span><strong>Settings</strong><span aria-hidden="true">↗</span></Link></nav>
    <div className="home-create"><Link className="button" href="/sessions/new">Host Session <span aria-hidden="true">↗</span></Link></div>
    <section className="home-preview" aria-labelledby="home-upcoming"><div className="home-preview-head"><div><span className="panel-index">YOUR COURT CALENDAR</span><h2 id="home-upcoming">ACTIVE & UPCOMING</h2></div><Link href="/sessions">View all →</Link></div><SessionRows sessions={current} view="current" emptyTitle="NO CURRENT SESSIONS" emptyText="Host a session to get everyone moving." /></section>
    <section className="home-preview home-preview-history" aria-labelledby="home-history"><div className="home-preview-head"><div><span className="panel-index">PREVIOUSLY</span><h2 id="home-history">HISTORY</h2></div><Link href="/history">View all →</Link></div><SessionRows sessions={history} view="history" emptyTitle="NO FINISHED SESSIONS" emptyText="Finished sessions will appear here." /></section>
    <footer className="site-footer"><span>RETICLA / PERSONAL WORKSPACE</span><span>@{profile.username}</span></footer>
  </main>;
}
