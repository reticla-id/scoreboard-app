import { z } from "zod";
import { isAvailableSport } from "../sports/catalog.ts";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.").refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number(value.slice(0, 4)) > 0 && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Choose a valid date.");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time.");

export const sessionSchema = z.object({
  name: z.string().trim().min(1, "Enter a session name.").max(120, "Use 120 characters or fewer."),
  date: dateSchema,
  startTime: timeSchema,
  sport: z.custom<"PADEL">(isAvailableSport, "Select an available sport."),
  location: z.string().trim().max(120, "Use 120 characters or fewer."),
});
export const sessionDetailsSchema = sessionSchema.omit({ sport: true });

export const sessionIdSchema = z.uuid();

export function sessionInput(formData: FormData) {
  return sessionSchema.safeParse({
    name: formData.get("name"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    sport: formData.get("sport"),
    location: formData.get("location") ?? "",
  });
}

export function sessionDetailsInput(formData: FormData) {
  return sessionDetailsSchema.safeParse({
    name: formData.get("name"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    location: formData.get("location") ?? "",
  });
}
