import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { WorkspaceHeader } from "@/components/workspace-header";
import { SessionWorkspaceHeading } from "@/components/session-workspace-heading";
import { AppFooter } from "@/components/app-footer";
import { requireWorkspace } from "@/lib/auth";
import { getOwnedSession } from "@/features/sessions/data";
import { ResultsView } from "@/features/leaderboard/results-view";
import { calculateSessionLeaderboard } from "@/features/leaderboard/service";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ownerId, profile } = await requireWorkspace();
  const { id } = await params;
  const session = await getOwnedSession(ownerId, id);
  const results = await calculateSessionLeaderboard(session);
  return <main className="site-shell workspace-page">
    <WorkspaceHeader profile={profile} />
    <BackLink href="/home" />
    <SessionWorkspaceHeading session={session} active="leaderboard" />
    <ResultsView sessionId={id} sport={session.sport} {...results} eventGlossary={session.sportConfig.rules.eventGlossary} />
    <AppFooter />
  </main>;
}
