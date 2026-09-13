import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a display name.").max(80, "Use 80 characters or fewer."),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "Use 3–30 lowercase letters, numbers, or underscores."),
  avatarUrl: z.union([z.literal(""), z.url().max(500).refine((value) => new URL(value).protocol === "https:", "Use an HTTPS image URL.")]),
});
