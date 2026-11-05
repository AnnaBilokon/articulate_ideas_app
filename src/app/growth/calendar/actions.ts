"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { EVENT_COLUMNS, toEvent, whenColumns } from "@/lib/calendar";
import { calendarEventSchema, eventWhenSchema, type CalendarEvent, type CalendarEventInput, type EventWhen } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Calendar events: add, change, move or resize, tick off, delete. Each returns
// the saved event, so the calendar can show it without a reload.

type Result = { error: string | null; event?: CalendarEvent };

const isId = (id: string) => z.uuid().safeParse(id).success;

export async function createEvent(input: CalendarEventInput): Promise<Result> {
  await requireSession();
  const parsed = calendarEventSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { title, notes, color, when } = parsed.data;
  const { data, error } = await db()
    .from("calendar_events")
    .insert({ title, notes: notes || null, color, ...whenColumns(when) })
    .select(EVENT_COLUMNS)
    .single();
  if (error) return { error: "Could not save it. Try again." };
  revalidatePath("/growth/calendar");
  return { error: null, event: toEvent(data) };
}

export async function updateEvent(id: string, input: CalendarEventInput): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const parsed = calendarEventSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { title, notes, color, when } = parsed.data;
  return save(id, { title, notes: notes || null, color, ...whenColumns(when) });
}

/** Dragged to a new time or day, or resized. */
export async function moveEvent(id: string, when: EventWhen): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const parsed = eventWhenSchema.safeParse(when);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return save(id, whenColumns(parsed.data));
}

export async function setEventDone(id: string, done: boolean): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  return save(id, { done_at: done ? new Date().toISOString() : null });
}

export async function deleteEvent(id: string): Promise<Result> {
  await requireSession();
  if (!isId(id)) return { error: "Not found." };
  const { error } = await db().from("calendar_events").delete().eq("id", id);
  if (error) return { error: "Could not delete it. Try again." };
  revalidatePath("/growth/calendar");
  return { error: null };
}

type EventFields = { title?: string; notes?: string | null; color?: string; day?: string | null; starts_at?: string | null; ends_at?: string | null; done_at?: string | null };

async function save(id: string, fields: EventFields): Promise<Result> {
  const { data, error } = await db().from("calendar_events").update(fields).eq("id", id).select(EVENT_COLUMNS).single();
  if (error) return { error: "Could not save it. Try again." };
  revalidatePath("/growth/calendar");
  return { error: null, event: toEvent(data) };
}
