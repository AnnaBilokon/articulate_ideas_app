// The learning tree: one leaf for every day with learning, and a fruit for
// every learned topic. The full tree is generated once from a fixed seed, so
// it is the same tree every day; more days only reveal more of it.

export type Point = { x: number; y: number };
export type Branch = { from: Point; to: Point; width: number; depth: number; order: number };
export type Leaf = Point & { angle: number; tone: 0 | 1 };

const BASE: Point = { x: 120, y: 200 };
const MAX_DEPTH = 6;
/** A year of learning days grows the full tree. */
export const FULL_GROWN_DAYS = 365;
const MAX_FRUIT = 24;

// Small seeded random generator (mulberry32).
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Shape = { branches: Branch[]; leaves: { leaf: Leaf; order: number }[]; tips: { point: Point; order: number }[] };

let cached: Shape | null = null;

function shape(): Shape {
  if (cached) return cached;
  const rand = random(20261021);
  const branches: Branch[] = [];
  // Breadth first, so inner branches come before outer ones.
  let level = [{ from: BASE, angle: -90, length: 52, width: 9, depth: 0 }];
  while (level.length > 0) {
    const next: typeof level = [];
    for (const b of level) {
      const rad = (b.angle * Math.PI) / 180;
      const to = { x: b.from.x + Math.cos(rad) * b.length, y: b.from.y + Math.sin(rad) * b.length };
      branches.push({ from: b.from, to, width: b.width, depth: b.depth, order: branches.length });
      if (b.depth >= MAX_DEPTH) continue;
      const count = b.depth >= 2 && rand() < 0.3 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const spread = count === 3 ? [-30, 0, 30][i] : i === 0 ? -1 : 1;
        const angle = count === 3 ? b.angle + spread + (rand() - 0.5) * 12 : b.angle + spread * (18 + rand() * 16);
        next.push({ from: to, angle, length: b.length * (0.68 + rand() * 0.12), width: Math.max(1, b.width * 0.68), depth: b.depth + 1 });
      }
    }
    level = next;
  }

  const leaves: Shape["leaves"] = [];
  const tips: Shape["tips"] = [];
  for (const b of branches) {
    if (b.depth < 2) continue;
    const angle = (Math.atan2(b.to.y - b.from.y, b.to.x - b.from.x) * 180) / Math.PI;
    for (const [t, side] of [[0.55, 1], [0.85, -1], [1, 1]] as const) {
      const nx = -(b.to.y - b.from.y);
      const ny = b.to.x - b.from.x;
      const n = Math.hypot(nx, ny) || 1;
      leaves.push({
        order: b.order,
        leaf: {
          x: b.from.x + (b.to.x - b.from.x) * t + (nx / n) * 4 * side,
          y: b.from.y + (b.to.y - b.from.y) * t + (ny / n) * 4 * side,
          angle: angle + side * 35,
          tone: rand() < 0.5 ? 0 : 1,
        },
      });
    }
    tips.push({ point: b.to, order: b.order });
  }
  // Spread fruit around the crown rather than along one side.
  tips.sort((a, b) => ((a.point.x * 7919) % 97) - ((b.point.x * 7919) % 97));
  cached = { branches, leaves, tips };
  return cached;
}

export type TreeState = {
  /** How big the tree is drawn, 0-1 of its full size. */
  scale: number;
  /** Leaves are drawn a little bigger while the tree is small, so each one shows. */
  leafScale: number;
  branches: (Branch & { grown: number })[];
  leaves: Leaf[];
  fruit: Point[];
  /** Where the next leaf grows, shown as a bud while today's learning isn't done. */
  nextLeaf: Leaf | null;
  base: Point;
};

/** The tree after `days` learning days, with `topics` learned topics as fruit. */
export function growTree(days: number, topics: number): TreeState {
  const { branches, leaves, tips } = shape();
  const progress = Math.sqrt(Math.min(Math.max(days, 0), FULL_GROWN_DAYS) / FULL_GROWN_DAYS);
  if (days <= 0) {
    return { scale: 0, leafScale: 1, branches: [], leaves: [], fruit: [], nextLeaf: leaves[0].leaf, base: BASE };
  }

  // About one branch for every two days, inner branches first, so a young
  // tree is a sprout with leaves rather than bare twigs. The newest branch is
  // still growing.
  const visible = 4.5 + days * 0.55;
  const shown = branches
    .map((b) => ({ ...b, grown: Math.min(1, Math.max(0, visible - b.order)) }))
    .filter((b) => b.grown > 0);
  const ready = new Set(shown.filter((b) => b.grown === 1).map((b) => b.order));
  const spots = leaves.filter((l) => ready.has(l.order)).map((l) => l.leaf);

  const scale = 0.55 + 0.45 * progress;
  return {
    scale,
    leafScale: Math.min(1.6, 1 / Math.sqrt(scale)),
    branches: shown,
    leaves: spots.slice(0, days),
    fruit: tips.filter((t) => ready.has(t.order)).slice(0, Math.min(topics, MAX_FRUIT)).map((t) => t.point),
    nextLeaf: spots[days] ?? null,
    base: BASE,
  };
}
