import Link from "next/link";

export default function Offline() {
  return <main className="center-shell"><section className="panel stack"><h1>YOU’RE OFFLINE.</h1><p className="muted">Reconnect to access your workspace.</p><Link className="button" href="/">Try again</Link></section></main>;
}
