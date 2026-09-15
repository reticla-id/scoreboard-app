import { Brand } from "@/components/brand";
import Link from "next/link";

export function WorkspaceHeader({ profile }: { profile: { displayName: string; avatarUrl: string | null; updatedAt: Date } }) {
  return <header className="site-header workspace-header">
    <Brand href="/home" />
    <Link className="settings-menu-link" href="/settings" aria-label={`Open Profile and Settings for ${profile.displayName}`}><span /><span /><span /></Link>
  </header>;
}
