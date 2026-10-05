// Mastery levels per topic, in order; see "Mastery level per topic" in PLAN.md.
// Each step can only raise mastery, never lower it.
const ORDER = [null, "seen", "recalled", "explained", "applied"] as const;

export type MasteryLevel = Exclude<(typeof ORDER)[number], null>;

const rank = (level: string | null) => ORDER.indexOf(level as (typeof ORDER)[number]);

/** True if reaching `level` would raise a topic from `current`. */
export function raisesMastery(current: string | null, level: MasteryLevel): boolean {
  return rank(current) < rank(level);
}
