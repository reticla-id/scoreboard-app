"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedSession } from "@/features/sessions/data";
import { shareExpiry } from "./share-token";

export type LiveSessionState = { error?: string; token?: string; expiresAt?: string };

export async function goLive(sessionId: string): Promise<LiveSessionState> {
  const { id: ownerId } = await requireWorkspace();
  await getOwnedSession(ownerId, sessionId);
  const now = new Date();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = shareExpiry(now);
  const result = await db().$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.sessions WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid FOR UPDATE`;
    if (!locked.length) return { error: "This session is unavailable." };
    const matchCount = await tx.match.count({ where: { sessionId } });
    if (matchCount < 1) return { error: "Generate at least one match before going live." };
    await tx.sessionShare.upsert({
      where: { sessionId },
      create: { sessionId, token, expiresAt },
      update: { token, expiresAt },
    });
    return {};
  });
  if (result.error) return result;
  revalidatePath(`/sessions/${sessionId}`);
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function stopLive(sessionId: string): Promise<LiveSessionState> {
  const { id: ownerId } = await requireWorkspace();
  await getOwnedSession(ownerId, sessionId);
  const current = await db().sessionShare.findUnique({ where: { sessionId }, select: { token: true } });
  await db().sessionShare.deleteMany({ where: { sessionId, session: { ownerId } } });
  revalidatePath(`/sessions/${sessionId}`);
  if (current) revalidatePath(`/live/${current.token}`);
  return {};
}
