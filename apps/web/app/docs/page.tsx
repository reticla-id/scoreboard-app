import type { Metadata } from "next";
import { AppFooter } from "@/components/app-footer";
import { BackLink } from "@/components/back-link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { requireWorkspace } from "@/lib/auth";

export const metadata: Metadata = { title: "Help & Guide" };

const sections = [
  ["what-is-reticla", "What is Reticla?"],
  ["hosting-a-session", "Hosting a Session"],
  ["session-status", "Session Status"],
  ["adding-players", "Adding Players"],
  ["importing-players", "Importing Players"],
  ["partner-modes", "Partner Modes"],
  ["generating-rounds", "Generating Rounds"],
  ["entering-scores", "Entering Scores"],
  ["advanced-scoring", "Advanced Scoring"],
  ["leaderboards", "Leaderboards"],
  ["sharing-results", "Sharing Results"],
  ["finishing-a-session", "Finishing a Session"],
  ["frequently-asked-questions", "Frequently Asked Questions"],
] as const;

function SectionLinks() {
  return <ol>{sections.map(([id, title], index) => <li key={id}><a href={`#${id}`}><span>{String(index + 1).padStart(2, "0")}</span>{title}</a></li>)}</ol>;
}

export default async function DocsPage() {
  const { profile } = await requireWorkspace();

  return <main className="site-shell workspace-page docs-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href="/home" />
    <header className="docs-head"><p className="eyebrow"><span className="dot" /> COURTSIDE REFERENCE</p><h1>RETICLA HELP<br /><span>&amp; GUIDE.</span></h1></header>
    <details className="docs-mobile-toc"><summary>On this page</summary><nav aria-label="Guide sections"><SectionLinks /></nav></details>
    <div className="docs-layout">
      <aside className="docs-sidebar"><nav aria-label="Guide sections"><p className="panel-index">ON THIS PAGE</p><SectionLinks /></nav></aside>
      <article className="docs-article">
        <section id="what-is-reticla"><h2>What is Reticla?</h2><p>Reticla helps you host sports sessions, manage players, generate matches, record scores, and share leaderboards.</p><p>Currently, Reticla is focused on Padel sessions.</p></section>

        <section id="hosting-a-session"><h2>Hosting a Session</h2><ol><li>Tap <strong>Host Session</strong>.</li><li>Enter a session name.</li><li>Select the sport.</li><li>Choose a date and time.</li><li>Save the session.</li></ol><p>Your session will appear in Home and Sessions.</p></section>

        <section id="session-status"><h2>Session Status</h2><h3>Upcoming</h3><p>A session scheduled for a future date and time.</p><h3>Active</h3><p>A session currently in progress.</p><h3>History</h3><p>A session that has been marked as finished.</p></section>

        <section id="adding-players"><h2>Adding Players</h2><p>Open a session and navigate to <strong>Players</strong>.</p><p>You can:</p><ul><li>Add players manually.</li><li>Import players from a list.</li><li>Edit player names.</li><li>Remove players.</li></ul><p>A minimum of 4 players is required to generate matches for Padel.</p></section>

        <section id="importing-players"><h2>Importing Players</h2><p>Use <strong>Import Players</strong> to quickly add multiple players.</p><p>Supported formats:</p><h3>Text List</h3><pre><code>{"Alex\nJohn\nSarah\nMichael"}</code></pre><h3>CSV</h3><pre><code>{"Alex\nJohn\nSarah\nMichael"}</code></pre><h3>XLSX</h3><p>Upload a spreadsheet containing player names.</p><p>Only player names are required.</p></section>

        <section id="partner-modes"><h2>Partner Modes</h2><h3>Rotate Partners</h3><p>Players are mixed automatically.</p><p>Reticla generates different partner combinations across rounds.</p><h3>Fixed Partners</h3><p>Players stay with their assigned partner.</p><p>Match generation rotates opponents while keeping partners together.</p></section>

        <section id="generating-rounds"><h2>Generating Rounds</h2><p>After players are saved:</p><ol><li>Open the Players tab.</li><li>Tap <strong>Generate Round</strong>.</li></ol><p>Reticla creates all available match combinations for the current round.</p><p>You can generate additional rounds at any time.</p><h3>Reset Matches</h3><p>Use <strong>Reset Matches</strong> to remove all generated matches and create a new set.</p><p>Existing match results will be removed.</p></section>

        <section id="entering-scores"><h2>Entering Scores</h2><p>Open the <strong>Matches</strong> tab.</p><p>Use:</p><ul><li><strong>+1</strong> to add points.</li><li><strong>-1</strong> to remove points.</li></ul><p>Scores can be edited later if corrections are needed.</p></section>

        <section id="advanced-scoring"><h2>Advanced Scoring</h2><p>Advanced Scoring tracks how points were won or lost.</p><p>Tap a player, then select an outcome.</p><h3>Winner (W)</h3><p>A clean offensive shot the opponent cannot return.</p><h3>Forced Error (FE)</h3><p>An opponent misses due to pressure from an aggressive shot.</p><h3>Unforced Error (UE)</h3><p>A missed shot without significant pressure.</p><h3>Double Fault (DF)</h3><p>Missing both serve attempts in a single point.</p><p>Reticla automatically updates the match score based on the selected outcome.</p></section>

        <section id="leaderboards"><h2>Leaderboards</h2><p>Reticla generates leaderboards from recorded match data.</p><h3>Session Leaderboard</h3><p>Ranks players based on session performance.</p><h3>Player Statistics</h3><p>Tracks:</p><ul><li>Winners (W)</li><li>Forced Errors (FE)</li><li>Unforced Errors (UE)</li><li>Double Faults (DF)</li><li>Net Score</li><li>Efficiency</li></ul><p>Statistics are recalculated when the leaderboard is refreshed.</p></section>

        <section id="sharing-results"><h2>Sharing Results</h2><p>You can export:</p><ul><li>Session Leaderboards</li><li>Player Statistics</li></ul><p>Available formats:</p><ul><li>Copy as Image</li><li>Download PNG</li></ul><p>Exports use the current device layout and include a transparent background for easy sharing on social media and design tools.</p></section>

        <section id="finishing-a-session"><h2>Finishing a Session</h2><p>When the session is complete:</p><ol><li>Open the Overview tab.</li><li>Tap <strong>Finish Session</strong>.</li></ol><p>This moves the session to History.</p><p>After finishing:</p><ul><li>Players are locked.</li><li>Match generation is locked.</li><li>Scores can still be edited.</li></ul></section>

        <section id="frequently-asked-questions"><h2>Frequently Asked Questions</h2><h3>Can I edit scores after a match?</h3><p>Yes. Match scores remain editable.</p><h3>Can I add players after generating rounds?</h3><p>Yes, but generated rounds may need to be regenerated.</p><h3>Can I change the sport after creating a session?</h3><p>No. Sports are locked after creation to preserve session rules.</p><h3>Can I export leaderboards?</h3><p>Yes. Use Copy as Image or Download PNG.</p><h3>Can I host multiple sessions?</h3><p>Yes. Each session is completely independent from other sessions.</p><h3>Does one session affect another?</h3><p>No. Players, matches, scores, and leaderboards are isolated within each session.</p></section>
      </article>
    </div>
    <AppFooter />
  </main>;
}
