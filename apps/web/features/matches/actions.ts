"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedSession } from "@/features/sessions/data";
import { sessionIdSchema } from "@/features/sessions/schema";
import type { EventType } from "./scoring";
import { readFixedPairs, readPartnerMode } from "@/features/sports/padel/partner-modes";

export type GenerateState = { error?: string };
export type MatchActionResult = { success?: string; error?: string; scoreA?: number; scoreB?: number };
type ScoreRow = { score_a: number; score_b: number };
type TrackedMatch = ScoreRow & { player_a_one: string; player_a_two: string; player_b_one: string; player_b_two: string };

async function ownedSession(sessionId: string) {
  const { id: ownerId } = await requireWorkspace();
  const session = await getOwnedSession(ownerId, sessionId);
  return { ownerId, rules: session.sportConfig.rules };
}

function refreshSession(sessionId: string) {
  revalidatePath("/home");
  revalidatePath("/sessions");
  revalidatePath("/history");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath(`/sessions/${sessionId}/players`);
  revalidatePath(`/sessions/${sessionId}/matches`);
  revalidatePath(`/sessions/${sessionId}/leaderboard`);
}

export async function generateRound(sessionId: string, _state: GenerateState, _formData: FormData): Promise<GenerateState> {
  void _state;
  void _formData;
  const { ownerId, rules } = await ownedSession(sessionId);
  const result = await db().$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ partner_mode: string; fixed_pairs: unknown }[]>`SELECT partner_mode, fixed_pairs FROM public.sessions WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid AND completed_at IS NULL FOR UPDATE`;
    if (!locked.length) return { error: "This session is finished. Rounds are read only." };
    const players = await tx.player.findMany({ where: { sessionId, removedAt: null }, select: { id: true, name: true } });
    const mode = readPartnerMode(locked[0].partner_mode);
    const pairs = readFixedPairs(locked[0].fixed_pairs);
    const availability = rules.padelRoundAvailability(mode, players, pairs, rules.minimumPlayers);
    if (!availability.enabled) return { error: availability.message };
    const matches = rules.generatePadelMatches(mode, players, pairs, randomBytes(4).readUInt32BE(0));
    const previous = await tx.round.findFirst({ where: { sessionId }, orderBy: { number: "desc" }, select: { number: true } });
    const number = (previous?.number ?? 0) + 1;
    const round = await tx.round.create({ data: { sessionId, number } });
    for (let offset = 0; offset < matches.length; offset += 500) {
      const batch = matches.slice(offset, offset + 500);
      const teams = batch.flatMap((match) => [
        { id: randomUUID(), sessionId, playerOneId: match.teamA[0].id, playerTwoId: match.teamA[1].id },
        { id: randomUUID(), sessionId, playerOneId: match.teamB[0].id, playerTwoId: match.teamB[1].id },
      ]);
      await tx.team.createMany({ data: teams });
      await tx.match.createMany({ data: batch.map((_, index) => ({ sessionId, roundId: round.id, teamAId: teams[index * 2].id, teamBId: teams[index * 2 + 1].id, position: offset + index + 1, status: "UPCOMING" })) });
    }
    return { number };
  }, { maxWait: 10_000, timeout: 120_000 });
  if ("error" in result) return result;
  refreshSession(sessionId);
  redirect(`/sessions/${sessionId}/matches#round-${result.number}`);
}

export async function resetMatches(sessionId: string, _state: GenerateState, formData: FormData): Promise<GenerateState> {
  void _state;
  const { ownerId } = await ownedSession(sessionId);
  if (formData.get("confirm") !== "yes") return { error: "Confirm the reset first." };
  const result = await db().$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.sessions WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid AND completed_at IS NULL FOR UPDATE`;
    if (!locked.length) return { error: "This session is finished. Rounds are read only." };
    await tx.round.deleteMany({ where: { sessionId } }); // Matches and future match-owned results cascade.
    await tx.team.deleteMany({ where: { sessionId } });
    return {};
  }, { maxWait: 10_000, timeout: 120_000 });
  if (result.error) return result;
  refreshSession(sessionId);
  redirect(`/sessions/${sessionId}/players`);
}

export async function advanceMatch(sessionId: string, matchId: string, nextStatus: "LIVE" | "FINISHED"): Promise<MatchActionResult> {
  await ownedSession(sessionId);
  if (!sessionIdSchema.safeParse(matchId).success || !["LIVE", "FINISHED"].includes(nextStatus)) return { error: "Invalid match action." };
  const rows = nextStatus === "LIVE"
    ? await db().$queryRaw<ScoreRow[]>`UPDATE public.matches SET status = 'LIVE', score_a = COALESCE(score_a, 0), score_b = COALESCE(score_b, 0), updated_at = now() WHERE id = ${matchId}::uuid AND session_id = ${sessionId}::uuid AND status = 'UPCOMING' RETURNING score_a, score_b`
    : await db().$queryRaw<ScoreRow[]>`UPDATE public.matches SET status = 'FINISHED', updated_at = now() WHERE id = ${matchId}::uuid AND session_id = ${sessionId}::uuid AND status = 'LIVE' AND score_a IS NOT NULL AND score_b IS NOT NULL AND score_a <> score_b RETURNING score_a, score_b`;
  if (!rows.length) return { error: nextStatus === "FINISHED" ? "Scores must differ before finishing this match." : "This match changed. Refresh and try again." };
  refreshSession(sessionId);
  return { success: nextStatus === "LIVE" ? "Match started." : "Match finished.", scoreA: rows[0].score_a, scoreB: rows[0].score_b };
}

export async function changeScore(sessionId: string, matchId: string, side: "A" | "B", delta: -1 | 1): Promise<MatchActionResult> {
  await ownedSession(sessionId);
  if (!sessionIdSchema.safeParse(matchId).success || !["A", "B"].includes(side) || ![-1, 1].includes(delta)) return { error: "Invalid score action." };
  const rows = side === "A"
    ? await db().$queryRaw<ScoreRow[]>`UPDATE public.matches SET score_a = LEAST(99, GREATEST(0, COALESCE(score_a, 0) + ${delta})), score_b = COALESCE(score_b, 0), updated_at = now() WHERE id = ${matchId}::uuid AND session_id = ${sessionId}::uuid AND status = 'LIVE' RETURNING score_a, score_b`
    : await db().$queryRaw<ScoreRow[]>`UPDATE public.matches SET score_a = COALESCE(score_a, 0), score_b = LEAST(99, GREATEST(0, COALESCE(score_b, 0) + ${delta})), updated_at = now() WHERE id = ${matchId}::uuid AND session_id = ${sessionId}::uuid AND status = 'LIVE' RETURNING score_a, score_b`;
  if (!rows.length) return { error: "This match is no longer live. Refresh and try again." };
  return { scoreA: rows[0].score_a, scoreB: rows[0].score_b };
}

export async function resetScore(sessionId: string, matchId: string): Promise<MatchActionResult> {
  await ownedSession(sessionId);
  if (!sessionIdSchema.safeParse(matchId).success) return { error: "Invalid match." };
  const changed = await db().$transaction(async (tx) => {
    const rows = await tx.$queryRaw<ScoreRow[]>`UPDATE public.matches SET score_a = 0, score_b = 0, updated_at = now() WHERE id = ${matchId}::uuid AND session_id = ${sessionId}::uuid AND status = 'LIVE' RETURNING score_a, score_b`;
    if (!rows.length) return false;
    await tx.matchEvent.deleteMany({ where: { sessionId, matchId } });
    return true;
  });
  if (!changed) return { error: "This match is no longer live. Refresh and try again." };
  return { scoreA: 0, scoreB: 0 };
}

export async function saveFinishedScore(sessionId: string, matchId: string, scoreA: number, scoreB: number, previousA: number | null, previousB: number | null): Promise<MatchActionResult> {
  await ownedSession(sessionId);
  if (!sessionIdSchema.safeParse(matchId).success || ![scoreA, scoreB].every((value) => Number.isInteger(value) && value >= 0 && value <= 99) || scoreA === scoreB || ![previousA, previousB].every((value) => value === null || Number.isInteger(value) && value >= 0 && value <= 99)) return { error: "Enter a valid, non-tied final score." };
  const rows = await db().$queryRaw<ScoreRow[]>`UPDATE public.matches SET score_a = ${scoreA}, score_b = ${scoreB}, updated_at = now() WHERE id = ${matchId}::uuid AND session_id = ${sessionId}::uuid AND status = 'FINISHED' AND score_a IS NOT DISTINCT FROM ${previousA} AND score_b IS NOT DISTINCT FROM ${previousB} RETURNING score_a, score_b`;
  if (!rows.length) return { error: "This result changed. Refresh and try again." };
  refreshSession(sessionId);
  return { success: "Final score saved.", scoreA: rows[0].score_a, scoreB: rows[0].score_b };
}

export async function recordMatchEvent(sessionId: string, matchId: string, playerId: string, type: EventType): Promise<MatchActionResult> {
  const { rules } = await ownedSession(sessionId);
  if (![matchId, playerId].every((id) => sessionIdSchema.safeParse(id).success) || !rules.eventTypes.includes(type)) return { error: "Invalid point action." };
  const result = await db().$transaction(async (tx) => {
    const rows = await tx.$queryRaw<TrackedMatch[]>`SELECT m.score_a, m.score_b, a.player_one_id AS player_a_one, a.player_two_id AS player_a_two, b.player_one_id AS player_b_one, b.player_two_id AS player_b_two FROM public.matches m JOIN public.teams a ON a.id = m.team_a_id AND a.session_id = m.session_id JOIN public.teams b ON b.id = m.team_b_id AND b.session_id = m.session_id WHERE m.id = ${matchId}::uuid AND m.session_id = ${sessionId}::uuid AND m.status = 'LIVE' FOR UPDATE OF m`;
    const match = rows[0];
    if (!match) return { error: "This match is no longer live. Refresh and try again." };
    const side = playerId === match.player_a_one || playerId === match.player_a_two ? "A" : playerId === match.player_b_one || playerId === match.player_b_two ? "B" : null;
    if (!side) return { error: "Choose a player in this match." };
    const winningSide = rules.pointWinningSide(side, type);
    const scoreA = match.score_a + Number(winningSide === "A");
    const scoreB = match.score_b + Number(winningSide === "B");
    if (scoreA > 99 || scoreB > 99) return { error: "The score has reached its limit." };
    await tx.matchEvent.create({ data: { sessionId, matchId, playerId, type } });
    await tx.match.update({ where: { id: matchId }, data: { scoreA, scoreB } });
    return { scoreA, scoreB };
  });
  return result;
}
