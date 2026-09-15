"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function BackLink({ href, previous = false }: { href: string; previous?: boolean }) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(href);
  }

  return <nav className="page-back" aria-label="Back navigation">{previous
    ? <button type="button" onClick={goBack}><span aria-hidden="true">←</span> Back</button>
    : <Link href={href}><span aria-hidden="true">←</span> Back</Link>}
  </nav>;
}
