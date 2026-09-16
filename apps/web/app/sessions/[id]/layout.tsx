import type { ReactNode } from "react";

// Session workspaces are always resolved per request. This prevents an
// authenticated session route or a newly-enabled sport from inheriting a
// stale not-found result across Overview, Players, Matches, and Leaderboard.
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export default function SessionLayout({ children }: { children: ReactNode }) {
  return children;
}
