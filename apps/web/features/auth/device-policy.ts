export const MAX_ACTIVE_DEVICES = 3;

export function admissionDecision(
  existing: { userId: string; revokedAt: Date | null } | null,
  userId: string,
  activeCount: number,
): "active" | "revoked" | "limit" | "new" {
  if (existing) return existing.userId === userId && !existing.revokedAt ? "active" : "revoked";
  return activeCount >= MAX_ACTIVE_DEVICES ? "limit" : "new";
}
