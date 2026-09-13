"use server";

import { redirect } from "next/navigation";
import { requireUserId, getProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { profileSchema } from "@/features/profile/schema";

export type ProfileState = { error?: string };

export async function createProfile(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const id = await requireUserId();
  if (await getProfile(id)) redirect("/home");
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    username: formData.get("username"),
    avatarUrl: formData.get("avatarUrl") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  try {
    await db().profile.create({
      data: {
        id,
        displayName: parsed.data.displayName,
        username: parsed.data.username,
        avatarUrl: parsed.data.avatarUrl || null,
      },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { error: "That username is taken. Choose another." };
    }
    throw error;
  }
  redirect("/home");
}
