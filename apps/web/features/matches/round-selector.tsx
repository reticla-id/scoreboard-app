"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useDismissiblePopover } from "@/hooks/use-dismissible-popover";

export type SelectableRound = { id: string; number: number; matchCount: number };

export function RoundSelector({ rounds, selected, basePath }: { rounds: SelectableRound[]; selected: SelectableRound; basePath: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDetailsElement>(null);
  function close() { if (root.current) root.current.open = false; setOpen(false); }
  useDismissiblePopover(open, root, close);

  return <details className="round-selector" ref={root} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><span><small>SELECTED ROUND</small><strong>Round {selected.number}</strong></span><span><b>{selected.matchCount.toLocaleString("en-US")} matches</b><svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span></summary>
    <nav className="round-selector-menu" aria-label="Choose a round">{rounds.map((round) => <Link key={round.id} href={`${basePath}?round=${round.number}`} aria-current={round.id === selected.id ? "page" : undefined} onClick={close}><span>Round {round.number}</span><small>{round.matchCount.toLocaleString("en-US")} matches</small></Link>)}</nav>
  </details>;
}
