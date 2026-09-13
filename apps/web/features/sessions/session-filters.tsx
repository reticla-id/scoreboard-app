"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { useDismissiblePopover } from "@/hooks/use-dismissible-popover";

export function SessionFilters({ basePath, initialDate = "", initialCourt = "" }: { basePath: "/sessions" | "/history"; initialDate?: string; initialCourt?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(initialDate);
  const [court, setCourt] = useState(initialCourt);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDetailsElement>(null);
  function close() { if (root.current) root.current.open = false; setOpen(false); }
  useDismissiblePopover(open, root, close);
  const count = Number(!!initialDate) + Number(!!initialCourt);
  function navigate(nextDate: string, nextCourt: string) {
    const query = new URLSearchParams();
    if (nextDate) query.set("date", nextDate);
    if (nextCourt.trim()) query.set("court", nextCourt.trim());
    close();
    startTransition(() => router.replace(`${basePath}${query.size ? `?${query}` : ""}`, { scroll: false }));
  }
  return <details className="browse-filter" ref={root} onToggle={(event) => setOpen(event.currentTarget.open)}><summary>Filters{count ? ` · ${count}` : ""}<span aria-hidden="true">⌄</span></summary><div className="browse-filter-panel"><div className="browse-filter-fields"><div><span className="session-field-label">Date</span><CalendarDatePicker value={date} onChange={setDate} optional /></div><div><label htmlFor="court-filter">Court</label><input id="court-filter" type="search" value={court} onChange={(event) => setCourt(event.target.value)} maxLength={120} placeholder="Court or venue" /></div></div><div className="browse-filter-actions"><button className="button button-small" type="button" disabled={pending} onClick={() => navigate(date, court)}>{pending ? "Applying…" : "Apply filters"}</button><button className="text-link" type="button" disabled={pending} onClick={() => { setDate(""); setCourt(""); navigate("", ""); }}>Reset</button></div></div></details>;
}
