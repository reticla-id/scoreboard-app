"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/features/profile/schema";
import { AVATAR_BUCKET, MAX_AVATAR_BYTES, avatarExtension, avatarSource, ownedAvatarPath } from "@/features/profile/avatar";

export type SettingsState = { error?: string; success?: string; avatarSrc?: string | null; revision?: number };

export async function updateSettings(_state: SettingsState, formData: FormData): Promise<SettingsState> {
  const { id, profile } = await requireWorkspace();
  const parsed = profileSchema.pick({ displayName: true, username: true }).safeParse({
    displayName: formData.get("displayName"), username: formData.get("username"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  const file = formData.get("avatar");
  const hasFile = file instanceof File && file.size > 0;
  const remove = formData.get("removeAvatar") === "true";
  if (hasFile && remove) return { error: "Choose a new picture or remove the current one." };
  let uploadedPath: string | null = null;
  let nextAvatar = remove ? null : profile.avatarUrl;
  const supabase = await createClient();

  if (hasFile) {
    if (file.size > MAX_AVATAR_BYTES) return { error: "Choose an image under 2 MB." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = avatarExtension(bytes, file.type);
    if (!extension) return { error: "Use a valid PNG, JPG, or WebP image." };
    uploadedPath = `${id}/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(uploadedPath, bytes, {
      contentType: file.type, cacheControl: "300", upsert: false,
    });
    if (error) return { error: "Picture upload failed. Try again." };
    nextAvatar = `storage:${uploadedPath}`;
  }

  try {
    const updated = await db().profile.update({
      where: { id }, data: { ...parsed.data, avatarUrl: nextAvatar },
    });
    const oldPath = ownedAvatarPath(profile.avatarUrl, id);
    if (oldPath && oldPath !== uploadedPath && (remove || hasFile)) {
      await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
    }
    revalidatePath("/settings");
    revalidatePath("/home");
    return { success: "Profile saved.", avatarSrc: avatarSource(updated.avatarUrl, updated.updatedAt), revision: Date.now() };
  } catch (error) {
    if (uploadedPath) await supabase.storage.from(AVATAR_BUCKET).remove([uploadedPath]);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "That username is taken. Choose another." };
    }
    return { error: "Could not save your profile. Try again." };
  }
}
