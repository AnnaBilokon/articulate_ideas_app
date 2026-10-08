// Nudges for a stuck brain dump: cues that point at what to recall without
// giving any of it away. General prompts frame it; the lesson's own part
// titles say which areas to cover.

import { DOUBTS_CHUNK_TITLE } from "@/lib/schemas/lesson";

const SKIP_TITLES = new Set([DOUBTS_CHUNK_TITLE]);

export function dumpCues(chunkTitles: string[]): string[] {
  const parts = chunkTitles.filter((t) => !SKIP_TITLES.has(t)).map((t) => `What do you remember about “${t}”?`);
  return [
    "What's the main idea, in one or two sentences?",
    ...parts,
    "Why does it work or happen? What's the cause?",
    "Give an example, from the lesson or your own life.",
    "Where does it apply, and where does it stop applying?",
    "What confused or surprised you?",
  ];
}
