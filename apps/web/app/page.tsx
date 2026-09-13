import Link from "next/link";
import { Brand } from "@/components/brand";
import { redirectAuthenticatedUser } from "@/lib/auth";

export default async function Landing() {
  await redirectAuthenticatedUser();
  return <main className="site-shell">
    <header className="site-header"><Brand /><nav aria-label="Main navigation"><Link className="text-link" href="/sign-in">Sign in</Link><Link className="button button-small" href="/sign-up">Get started</Link></nav></header>
    <section className="landing-hero">
      <div className="landing-copy"><p className="eyebrow"><span className="dot" /> THE COURTSIDE WORKSPACE</p><h1>LESS SETUP.<br /><span>MORE GAME.</span></h1><p className="landing-description">Host your padel session from roster to results. Everything you need to keep the games moving, in one place.</p><Link className="button landing-cta" href="/sign-up">Start hosting <span aria-hidden="true">↗</span></Link></div>
      <div className="landing-flow"><div className="landing-flow-heading"><span>ONE SESSION, START TO FINISH</span><span>01 — 04</span></div><ol><li><span>01</span><strong>Build your roster</strong><small>Add or import players in seconds.</small></li><li><span>02</span><strong>Generate matchups</strong><small>Get everyone on court.</small></li><li><span>03</span><strong>Track the scores</strong><small>Run each game courtside.</small></li><li><span>04</span><strong>Share the results</strong><small>Take the table wherever you go.</small></li></ol></div>
    </section>
    <footer className="site-footer"><span>RETICLA / BUILT FOR THE HOST</span><span>KEEP THE GAME MOVING.</span></footer>
  </main>;
}
