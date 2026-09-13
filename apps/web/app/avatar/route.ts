import { getUserId, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, ownedAvatarPath } from "@/features/profile/avatar";

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return new Response(null, { status: 401 });
  if (new URL(request.url).searchParams.get("owner") !== userId) return new Response(null, { status: 404 });
  const profile = await getProfile(userId);
  const path = ownedAvatarPath(profile?.avatarUrl ?? null, userId);
  if (!path) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).download(path);
  if (error || !data) return new Response(null, { status: 404 });
  const contentType = path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(data, { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
}
