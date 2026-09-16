import "server-only";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { courtDateKey, dateFromInput } from "@/features/sessions/dates";
import { sessionIdSchema, sessionSchema } from "@/features/sessions/schema";
import { resolveSport } from "@/features/sports/sport-registry";

export async function getOwnedSession(ownerId: string, id: string) {
  if (!sessionIdSchema.safeParse(id).success) notFound();
  const session = await db().session.findFirst({ where: { id, ownerId } });
  if (!session) notFound();
  return { ...session, sportConfig: resolveSport(session.sport) };
}

const previewSelect = {
  id: true, name: true, date: true, startTime: true, completedAt: true, location: true, sport: true, matchFormat: true, partnerMode: true,
  _count: { select: { players: { where: { removedAt: null } }, rounds: true, matches: true } },
  matches: { where: { status: "LIVE" }, select: { id: true }, take: 1 },
} as const;

export async function getHomeSessions(ownerId: string) {
  const today = dateFromInput(courtDateKey());
  return Promise.all([
    db().session.findMany({ where: { ownerId, completedAt: null, date: { gte: today } }, select: previewSelect, orderBy: [{ date: "asc" }, { startTime: { sort: "asc", nulls: "last" } }, { id: "asc" }], take: 3 }),
    db().session.findMany({ where: { ownerId, OR: [{ completedAt: { not: null } }, { date: { lt: today } }] }, select: previewSelect, orderBy: [{ date: "desc" }, { startTime: { sort: "desc", nulls: "last" } }, { id: "desc" }], take: 3 }),
  ]);
}

export type SessionView = "current" | "history";
export type SessionFilters = { date?: string; court?: string };

export function normalizeSessionFilters(filters: SessionFilters): SessionFilters {
  return {
    date: filters.date && sessionSchema.shape.date.safeParse(filters.date).success ? filters.date : undefined,
    court: filters.court?.trim().slice(0, 120) || undefined,
  };
}

export async function getSessionPage(ownerId: string, page: number, view: SessionView, filters: SessionFilters = {}) {
  const take = 20;
  const clean = normalizeSessionFilters(filters);
  const today = dateFromInput(courtDateKey());
  const where: Prisma.SessionWhereInput = {
    ownerId,
    AND: [
      view === "history"
        ? { OR: [{ completedAt: { not: null } }, { date: { lt: today } }] }
        : { completedAt: null, date: { gte: today } },
      ...(clean.date ? [{ date: dateFromInput(clean.date) }] : []),
    ],
    ...(clean.court ? { location: { contains: clean.court, mode: "insensitive" } } : {}),
  };
  const orderBy: Prisma.SessionOrderByWithRelationInput[] = view === "history"
    ? [{ date: "desc" }, { startTime: { sort: "desc", nulls: "last" } }, { id: "desc" }]
    : [{ date: "asc" }, { startTime: { sort: "asc", nulls: "last" } }, { id: "asc" }];
  const [sessions, total] = await Promise.all([
    db().session.findMany({ where, select: previewSelect, orderBy, skip: (page - 1) * take, take }),
    db().session.count({ where }),
  ]);
  return { sessions, total, pages: Math.ceil(total / take), filters: clean };
}
