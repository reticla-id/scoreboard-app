import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { deviceInfo } from "./device-info";
import { admissionDecision } from "./device-policy";

const SEEN_INTERVAL_MS = 5 * 60 * 1000;
export type DeviceAdmission = "active" | "limit" | "revoked" | "invalid";

export async function admitCurrentAuthSession(supabase: Awaited<ReturnType<typeof createClient>>): Promise<DeviceAdmission> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || typeof data?.claims?.sub !== "string" || typeof data.claims.session_id !== "string") return "invalid";
  return ensureDeviceSession(data.claims.sub, data.claims.session_id);
}

export async function ensureDeviceSession(userId: string, sessionId: string): Promise<DeviceAdmission> {
  const existing = await db().deviceSession.findUnique({ where: { sessionId }, select: { userId: true, revokedAt: true, lastSeenAt: true, deviceName: true } });
  if (existing) {
    if (admissionDecision(existing, userId, 0) === "revoked") return "revoked";
    if (existing.deviceName === "Existing device") {
      await db().deviceSession.updateMany({ where: { sessionId, userId, revokedAt: null }, data: { ...deviceInfo((await headers()).get("user-agent")), lastSeenAt: new Date() } });
    } else if (Date.now() - existing.lastSeenAt.getTime() >= SEEN_INTERVAL_MS) {
      await db().deviceSession.updateMany({ where: { sessionId, userId, revokedAt: null }, data: { lastSeenAt: new Date() } });
    }
    return "active";
  }

  const info = deviceInfo((await headers()).get("user-agent"));
  return db().$transaction(async (tx) => {
    // Serialize simultaneous logins for one account before checking the limit.
    const users = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM auth.users WHERE id = ${userId}::uuid FOR UPDATE`;
    if (!users.length) return "invalid";
    const seen = await tx.deviceSession.findUnique({ where: { sessionId }, select: { userId: true, revokedAt: true } });
    if (seen) return admissionDecision(seen, userId, 0) === "active" ? "active" : "revoked";
    const sessions = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM auth.sessions WHERE id = ${sessionId}::uuid AND user_id = ${userId}::uuid AND (not_after IS NULL OR not_after > now())`;
    if (!sessions.length) return "invalid";
    await tx.$executeRaw`DELETE FROM public.device_sessions WHERE user_id = ${userId}::uuid AND session_id IN (SELECT id FROM auth.sessions WHERE not_after IS NOT NULL AND not_after <= now())`;
    if (admissionDecision(null, userId, await tx.deviceSession.count({ where: { userId, revokedAt: null } })) === "limit") return "limit";
    await tx.deviceSession.create({ data: { sessionId, userId, ...info } });
    return "active";
  });
}

export async function listDeviceSessions(userId: string) {
  return db().deviceSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { sessionId: true, deviceName: true, browser: true, os: true, deviceType: true, lastSeenAt: true, createdAt: true },
  });
}
