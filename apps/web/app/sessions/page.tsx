import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SessionBrowsePage } from "@/features/sessions/session-browse-page";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ page?: string; date?: string; court?: string; view?: string }> }) {
  const query = await searchParams;
  if (query.view === "history") {
    const params = new URLSearchParams();
    for (const key of ["page", "date", "court"] as const) if (query[key]) params.set(key, query[key]);
    redirect(`/history${params.size ? `?${params}` : ""}`);
  }
  return <SessionBrowsePage view="current" query={query} />;
}
