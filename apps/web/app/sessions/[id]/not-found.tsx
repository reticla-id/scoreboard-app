import Link from "next/link";

export default function NotFound() {
  return <main className="center-shell"><div className="panel stack"><h1>SESSION NOT FOUND.</h1><p className="muted">This session is unavailable in your workspace.</p><Link className="button" href="/sessions">Back to sessions</Link></div></main>;
}
