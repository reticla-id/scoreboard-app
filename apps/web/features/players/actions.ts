"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getOwnedSession } from "@/features/sessions/data";
import { playerIdSchema, playerNameKey, playerNameSchema, validateImportNames } from "@/features/players/validation";
import { readFixedPairs, readPartnerMode, removeFixedPair } from "@/features/sports/padel/partner-modes";

export type PlayerActionState = { error?: string; success?: string; revision?: number };

function isUniqueConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function ownedSession(sessionId: string) {
  const { id: ownerId } = await requireWorkspace();
  await getOwnedSession(ownerId, sessionId);
  return ownerId;
}

async function withMutableRoster(sessionId: string, ownerId: string, operation: (tx: Prisma.TransactionClient) => Promise<PlayerActionState>): Promise<PlayerActionState> {
  return db().$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ partner_mode: string }[]>`SELECT partner_mode FROM public.sessions WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid AND completed_at IS NULL FOR UPDATE`;
    if (!locked.length) return { error: "This session is finished. Its roster is read only." };
    if (readPartnerMode(locked[0].partner_mode) === "FIXED" && await tx.round.count({ where: { sessionId } })) return { error: "Reset Matches before changing a fixed-partner roster." };
    return operation(tx);
  });
}

function refreshRoster(sessionId: string) {
  revalidatePath(`/sessions/${sessionId}/players`);
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath(`/sessions/${sessionId}/matches`);
  revalidatePath("/home");
  revalidatePath("/sessions");
  revalidatePath("/history");
}

export async function addPlayer(sessionId: string, state: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  const ownerId = await ownedSession(sessionId);
  const parsed = playerNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the player name." };
  try {
    const result = await withMutableRoster(sessionId, ownerId, async (tx) => { await tx.player.create({ data: { sessionId, name: parsed.data } }); return { success: `${parsed.data} added.`, revision: (state.revision ?? 0) + 1 }; });
    if (result.error) return result;
  } catch (error) {
    if (isUniqueConflict(error)) return { error: "That player is already in this session." };
    throw error;
  }
  refreshRoster(sessionId);
  return { success: `${parsed.data} added.`, revision: (state.revision ?? 0) + 1 };
}

export async function editPlayer(sessionId: string, playerId: string, _state: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  const ownerId = await ownedSession(sessionId);
  if (!playerIdSchema.safeParse(playerId).success) notFound();
  const parsed = playerNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the player name." };
  try {
    const result = await withMutableRoster(sessionId, ownerId, async (tx) => {
      const updated = await tx.player.updateMany({ where: { id: playerId, sessionId, removedAt: null }, data: { name: parsed.data } });
      if (!updated.count) notFound();
      return { success: "Player updated." };
    });
    if (result.error) return result;
  } catch (error) {
    if (isUniqueConflict(error)) return { error: "That player is already in this session." };
    throw error;
  }
  refreshRoster(sessionId);
  return { success: "Player updated." };
}

export async function removePlayer(sessionId: string, playerId: string, _state: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  const ownerId = await ownedSession(sessionId);
  if (!playerIdSchema.safeParse(playerId).success) notFound();
  if (formData.get("confirm") !== "yes") return { error: "Confirm removal first." };
  const result = await withMutableRoster(sessionId, ownerId, async (tx) => {
    const removed = await tx.player.updateMany({ where: { id: playerId, sessionId, removedAt: null }, data: { removedAt: new Date() } });
    if (!removed.count) notFound();
    const session = await tx.session.findUniqueOrThrow({ where: { id: sessionId }, select: { fixedPairs: true } });
    const nextPairs = removeFixedPair(readFixedPairs(session.fixedPairs), playerId);
    await tx.session.update({ where: { id: sessionId }, data: { fixedPairs: nextPairs } });
    return { success: "Player removed from this roster. Existing rounds are unchanged." };
  });
  if (result.error) return result;
  refreshRoster(sessionId);
  return { success: "Player removed from this roster. Existing rounds are unchanged." };
}

export async function importPlayers(sessionId: string, _state: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  const ownerId = await ownedSession(sessionId);
  const raw = formData.get("names");
  if (typeof raw !== "string" || raw.length > 50000) return { error: "Import data is too large." };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { error: "Invalid import data." }; }
  const validated = validateImportNames(value);
  if ("error" in validated) return { error: validated.error };
  try {
    const result = await withMutableRoster(sessionId, ownerId, async (tx) => {
      const existing = await tx.player.findMany({ where: { sessionId, removedAt: null }, select: { name: true } });
      const existingKeys = new Set(existing.map((player) => playerNameKey(player.name)));
      const duplicate = validated.names.find((name) => existingKeys.has(playerNameKey(name)));
      if (duplicate) return { error: `${duplicate} is already in this session. Review the roster and preview again.` };
      await tx.player.createMany({ data: validated.names.map((name) => ({ sessionId, name })) });
      return { success: `${validated.names.length} player${validated.names.length === 1 ? "" : "s"} added.` };
    });
    if (result.error) return result;
  } catch (error) {
    if (isUniqueConflict(error)) return { error: "A duplicate was added while you reviewed the list. Refresh and try again." };
    throw error;
  }
  refreshRoster(sessionId);
  return { success: `${validated.names.length} player${validated.names.length === 1 ? "" : "s"} added.` };
}
