export const AVATAR_BUCKET = "reticla-avatars";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function ownedAvatarPath(avatarUrl: string | null, userId: string) {
  if (!avatarUrl?.startsWith("storage:")) return null;
  const path = avatarUrl.slice("storage:".length);
  return new RegExp(`^${userId}/[0-9a-f-]{36}\\.(png|jpg|webp)$`, "i").test(path) ? path : null;
}

export function avatarSource(avatarUrl: string | null, updatedAt: Date) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("storage:")) {
    const owner = avatarUrl.slice("storage:".length).split("/")[0];
    return `/avatar?owner=${encodeURIComponent(owner)}&v=${updatedAt.getTime()}`;
  }
  return avatarUrl.startsWith("https://") ? avatarUrl : null;
}

export function avatarExtension(bytes: Uint8Array, type: string): "png" | "jpg" | "webp" | null {
  if (type === "image/png" && bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return "png";
  if (type === "image/jpeg" && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (type === "image/webp" && bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  return null;
}
