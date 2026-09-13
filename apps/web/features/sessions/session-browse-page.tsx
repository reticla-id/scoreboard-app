import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { requireWorkspace } from "@/lib/auth";
import { getSessionPage, type SessionView } from "@/features/sessions/data";
import { SessionRows } from "@/features/sessions/session-card";
import { SessionFilters } from "@/features/sessions/session-filters";

function browseUrl(path: string, page: number, date?: string, court?: string) {
  const query = new URLSearchParams();
  if (page > 1) query.set("page", String(page));
  if (date) query.set("date", date);
  if (court) query.set("court", court);
  return `${path}${query.size ? `?${query}` : ""}`;
}

export async function SessionBrowsePage({ view, query }: { view: SessionView; query: { page?: string; date?: string; court?: string } }) {
  const { id, profile } = await requireWorkspace();
  const page = query.page && /^\d+$/.test(query.page) ? Math.min(1000, Math.max(1, Number(query.page))) : 1;
  const { sessions, total, pages, filters } = await getSessionPage(id, page, view, { date: query.date, court: query.court });
  const history = view === "history";
  const path = history ? "/history" : "/sessions";
  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href="/home" />
    <header className="browse-page-head"><div><p className="eyebrow"><span className="dot" /> {history ? "FINISHED SESSIONS" : "YOUR COURT CALENDAR"}</p><h1>{history ? "HISTORY." : "SESSIONS."}</h1><p className="muted">{history ? "The sessions you've finished, newest first." : "Sessions still in your hands, sorted by date and time."}</p></div>{!history && <Link className="button" href="/sessions/new">Host Session ↗</Link>}</header>
    <div className="browse-toolbar"><span>{total} {history ? "finished" : "current"} session{total === 1 ? "" : "s"}</span><SessionFilters key={`${filters.date ?? ""}|${filters.court ?? ""}`} basePath={path} initialDate={filters.date} initialCourt={filters.court} /></div>
    <SessionRows sessions={sessions} view={view} grouped emptyTitle={history ? "NO HISTORY YET" : "NO SESSIONS FOUND"} emptyText={filters.date || filters.court ? "Try another date or court, or reset your filters." : history ? "Finished sessions will appear here." : "Host a session to get started."} />
    {pages > 1 && <nav className="pagination" aria-label="Session pages"><span>PAGE {page} / {pages}</span><div>{page > 1 && <Link className="button button-secondary" href={browseUrl(path, page - 1, filters.date, filters.court)}>Previous</Link>}{page < pages && <Link className="button button-secondary" href={browseUrl(path, page + 1, filters.date, filters.court)}>Next</Link>}</div></nav>}
    <footer className="site-footer"><span>RETICLA / {history ? "SESSION HISTORY" : "SESSION CALENDAR"}</span><span>@{profile.username}</span></footer>
  </main>;
}
