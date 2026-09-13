import { Brand } from "@/components/brand";
import { ProfileMenu } from "@/components/profile-menu";
import { avatarSource } from "@/features/profile/avatar";

export function WorkspaceHeader({ profile }: { profile: { displayName: string; avatarUrl: string | null; updatedAt: Date } }) {
  return <header className="site-header workspace-header">
    <Brand href="/home" />
    <ProfileMenu name={profile.displayName} avatarSrc={avatarSource(profile.avatarUrl, profile.updatedAt)} />
  </header>;
}
