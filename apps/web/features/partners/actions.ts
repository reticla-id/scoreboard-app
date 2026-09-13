"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedSession } from "@/features/sessions/data";
import { sessionIdSchema } from "@/features/sessions/schema";
import { addFixedPair, readFixedPairs, readPartnerMode, removeFixedPair, type PartnerMode } from "@/features/sports/padel/partner-modes";

export type PartnerActionResult = { error?: string; success?: string };

function refresh(sessionId: string) {
  revalidatePath(`/sessions/${sessionId}/players`);
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath(`/sessions/${sessionId}/matches`);
  revalidatePath("/home");
  revalidatePath("/sessions");
}

async function editableSession(sessionId: string) {
  const { id: ownerId } = await requireWorkspace();
  await getOwnedSession(ownerId, sessionId);
  return ownerId;
}

export async function setPartnerMode(sessionId: string, nextMode: PartnerMode): Promise<PartnerActionResult> {
  const ownerId = await editableSession(sessionId);
  if (nextMode !== "RANDOM" && nextMode !== "FIXED") return { error: "Choose a valid partner mode." };
  const result = await db().$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ partner_mode: string }[]>`SELECT partner_mode FROM public.sessions WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid AND completed_at IS NULL FOR UPDATE`;
    if (!locked.length) return { error: "This session is finished. Partner mode is locked." };
    if (await tx.round.count({ where: { sessionId } })) return { error: "Reset Matches before changing partner mode." };
    readPartnerMode(locked[0].partner_mode);
    await tx.session.update({ where: { id: sessionId }, data: { partnerMode: nextMode } });
    return { success: nextMode === "FIXED" ? "Fixed Partners selected." : "Random Partners selected." };
  });
  if (!result.error) refresh(sessionId);
  return result;
}

export async function changeFixedPair(sessionId: string, firstId: string, secondId: string | null): Promise<PartnerActionResult> {
  const ownerId = await editableSession(sessionId);
  if (!sessionIdSchema.safeParse(firstId).success || secondId !== null && !sessionIdSchema.safeParse(secondId).success) return { error: "Choose players from this roster." };
  const result = await db().$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ partner_mode: string; fixed_pairs: unknown }[]>`SELECT partner_mode, fixed_pairs FROM public.sessions WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid AND completed_at IS NULL FOR UPDATE`;
    if (!locked.length) return { error: "This session is finished. Partners are read only." };
    if (readPartnerMode(locked[0].partner_mode) !== "FIXED") return { error: "Choose Fixed Partners first." };
    if (await tx.round.count({ where: { sessionId } })) return { error: "Reset Matches before changing fixed partners." };
    const pairs = readFixedPairs(locked[0].fixed_pairs);
    const players = await tx.player.findMany({ where: { sessionId, removedAt: null }, select: { id: true, name: true } });
    if (!players.some((player) => player.id === firstId)) return { error: "Choose a player from this roster." };
    let next;
    try {
      if (secondId === null) {
        if (!pairs.some((pair) => pair.firstId === firstId || pair.secondId === firstId)) return { error: "That player has no fixed partner." };
        next = removeFixedPair(pairs, firstId);
      } else {
        next = addFixedPair(players, pairs, firstId, secondId);
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not update fixed partners." };
    }
    await tx.session.update({ where: { id: sessionId }, data: { fixedPairs: next } });
    return { success: secondId === null ? "Pair removed." : "Partners paired." };
  });
  if (!result.error) refresh(sessionId);
  return result;
}
