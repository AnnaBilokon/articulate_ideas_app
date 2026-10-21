// Review settings shared by the server and the Settings page.

/** Choices for "questions per day". Reviews over the limit wait for the next days. */
export const DAILY_CAP_OPTIONS = [5, 10, 15, 20, 30] as const;

/**
 * The steady pace of new topics a daily limit keeps up with, from simulating
 * the review ladder over six months at about 80% recall and 4-6 questions per
 * topic. The load keeps growing for months, because questions never leave the
 * ladder; remembering more lowers it by about a quarter.
 */
export const dailyCapHints: Record<(typeof DAILY_CAP_OPTIONS)[number], string> = {
  5: "about 1 short topic a week",
  10: "1-2 new topics a week",
  15: "about 2 new topics a week",
  20: "2-3 new topics a week",
  30: "3-4 new topics a week",
};
