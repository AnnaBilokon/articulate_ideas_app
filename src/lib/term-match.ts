// Checks a term-quiz answer against the term without Claude: capitals,
// punctuation, spaces, a leading "the/a/an" and a plural ending don't matter,
// either the abbreviation or its expanded form counts, and a small typo is
// "close". Anything else goes to Claude, which knows other names for it.

export type TermVerdict = "right" | "close" | "wrong";

const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");

const squash = (text: string) => text.replace(/ /g, "");
const singular = (text: string) => text.replace(/ies$/, "y").replace(/(?<=[^s])s$/, "");

function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

export function matchTerm(answer: string, term: string, fullForm: string | null): TermVerdict {
  const given = squash(normalize(answer));
  if (!given) return "wrong";
  for (const target of [term, fullForm]) {
    if (!target) continue;
    const expected = squash(normalize(target));
    if (!expected) continue;
    if (given === expected || singular(given) === singular(expected)) return "right";
    // Short terms must be exact; longer ones allow a typo or two.
    const allowed = expected.length <= 4 ? 0 : expected.length <= 8 ? 1 : 2;
    if (allowed > 0 && distance(singular(given), singular(expected)) <= allowed) return "close";
  }
  return "wrong";
}
