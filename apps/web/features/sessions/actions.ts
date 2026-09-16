"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateFromInput } from "@/features/sessions/dates";
import { sessionDetailsInput, sessionInput } from "@/features/sessions/schema";
import { getOwnedSession } from "@/features/sessions/data";

export type SessionFormState = { error?: string };

export async function createSession(_state: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const { id: ownerId } = await requireWorkspace();
  const parsed = sessionInput(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the session details." };
  const session = await db().session.create({
    data: {
      ownerId,
      name: parsed.data.name,
      date: dateFromInput(parsed.data.date),
      startTime: parsed.data.startTime,
      sport: parsed.data.sport,
      matchFormat: parsed.data.matchFormat,
      location: parsed.data.location || null,
    },
  });
  revalidatePath("/home");
  revalidatePath("/sessions");
  redirect(`/sessions/${session.id}`);
}

export async function updateSession(sessionId: string, _state: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const { id: ownerId } = await requireWorkspace();
  await getOwnedSession(ownerId, sessionId);
  const parsed = sessionDetailsInput(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the session details." };
  const result = await db().session.updateMany({
    where: { id: sessionId, ownerId },
    data: {
      name: parsed.data.name,
      date: dateFromInput(parsed.data.date),
      startTime: parsed.data.startTime,
      location: parsed.data.location || null,
    },
  });
  if (result.count === 0) notFound();
  revalidatePath("/home");
  revalidatePath("/sessions");
  revalidatePath("/history");
  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}`);
}

export async function deleteSession(sessionId: string, _state: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const { id: ownerId } = await requireWorkspace();
  await getOwnedSession(ownerId, sessionId);
  if (formData.get("confirm") !== "yes") return { error: "Confirm that you want to delete this session." };
  const result = await db().session.deleteMany({ where: { id: sessionId, ownerId } });
  if (result.count === 0) notFound();
  revalidatePath("/home");
  revalidatePath("/sessions");
  revalidatePath("/history");
  redirect("/home");
}

export async function finishSession(sessionId: string, _state: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const { id: ownerId } = await requireWorkspace();
  await getOwnedSession(ownerId, sessionId);
  if (formData.get("confirm") !== "yes") return { error: "Confirm that you want to finish this session." };
  const result = await db().session.updateMany({ where: { id: sessionId, ownerId, completedAt: null }, data: { completedAt: new Date() } });
  if (!result.count) return { error: "This session is already finished. Refresh to see its status." };
  revalidatePath("/home");
  revalidatePath("/sessions");
  revalidatePath("/history");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath(`/sessions/${sessionId}/players`);
  revalidatePath(`/sessions/${sessionId}/matches`);
  redirect(`/sessions/${sessionId}`);
}
