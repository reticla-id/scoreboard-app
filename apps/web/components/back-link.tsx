import Link from "next/link";

export function BackLink({ href }: { href: string }) {
  return <nav className="page-back" aria-label="Back navigation"><Link href={href}><span aria-hidden="true">←</span> Back</Link></nav>;
}
