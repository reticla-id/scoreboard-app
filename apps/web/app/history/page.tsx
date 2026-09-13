import type { Metadata } from "next";
import { SessionBrowsePage } from "@/features/sessions/session-browse-page";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string; date?: string; court?: string }> }) {
  return <SessionBrowsePage view="history" query={await searchParams} />;
}
