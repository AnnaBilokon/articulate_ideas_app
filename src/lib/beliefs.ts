import "server-only";
import type { BeliefStatus } from "@/lib/schemas";
import { db } from "@/lib/supabase";

// Limiting beliefs and strengths, for the Growth workspace and Journey home.

export type Belief = {
  id: string;
  createdAt: string;
  belief: string;
  origin: string | null;
  evidenceAgainst: string | null;
  reframe: string | null;
  status: BeliefStatus;
  strengthStart: number | null;
  strengthNow: number | null;
  letGoAt: string | null;
};

export type Strength = {
  id: string;
  title: string;
  description: string | null;
  /** Achievements that show it, newest first. */
  examples: { id: string; title: string; achievedOn: string }[];
};

const BELIEF_COLUMNS = "id, created_at, belief, origin, evidence_against, reframe, status, strength_start, strength_now, let_go_at";

type BeliefRow = {
  id: string;
  created_at: string;
  belief: string;
  origin: string | null;
  evidence_against: string | null;
  reframe: string | null;
  status: string;
  strength_start: number | null;
  strength_now: number | null;
  let_go_at: string | null;
};

const toBelief = (r: BeliefRow): Belief => ({
  id: r.id,
  createdAt: r.created_at,
  belief: r.belief,
  origin: r.origin,
  evidenceAgainst: r.evidence_against,
  reframe: r.reframe,
  status: r.status as BeliefStatus,
  strengthStart: r.strength_start,
  strengthNow: r.strength_now,
  letGoAt: r.let_go_at,
});

/** Every belief, newest first. */
export async function listBeliefs(): Promise<Belief[]> {
  const { data } = await db().from("beliefs").select(BELIEF_COLUMNS).order("created_at", { ascending: false });
  return (data ?? []).map(toBelief);
}

export async function getBelief(id: string): Promise<Belief | null> {
  const { data } = await db().from("beliefs").select(BELIEF_COLUMNS).eq("id", id).maybeSingle();
  return data ? toBelief(data) : null;
}

/** One new belief to keep in mind today, the same all day: from those being worked on that have one. */
export function reminderFor(beliefs: Belief[], today: string): Belief | null {
  const withReframe = beliefs.filter((b) => b.status === "working_on" && b.reframe);
  if (withReframe.length === 0) return null;
  const day = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000);
  return withReframe[day % withReframe.length];
}

/** Strengths, oldest first, with the achievements that show them. */
export async function listStrengths(): Promise<Strength[]> {
  const { data } = await db()
    .from("strengths")
    .select("id, title, description, strength_achievements(achievements(id, title, achieved_on))")
    .order("created_at", { ascending: true });
  return (data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    examples: s.strength_achievements
      .flatMap((l) => (l.achievements ? [{ id: l.achievements.id, title: l.achievements.title, achievedOn: l.achievements.achieved_on }] : []))
      .sort((a, b) => b.achievedOn.localeCompare(a.achievedOn)),
  }));
}
