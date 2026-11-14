// Colour palettes. Each palette's light and dark tokens live in
// src/app/globals.css; the comment above the palette blocks there says how to
// add one. The first palette is the base one (on :root and .dark).
//
// Each workspace has its own list of palettes to choose from and remembers
// its own choice, so Learning can be Orchard while Money is Pacific.

export const PALETTES = [
  { id: "orchard", name: "Orchard", swatches: ["#f3f9d2", "#cbeaa6", "#c0d684", "#63264a", "#3d0b37"] },
  { id: "lagoon", name: "Lagoon", swatches: ["#dbfe87", "#03b5aa", "#b2aa8e", "#7a306c", "#0c1b33"] },
  { id: "rose-mist", name: "Rose mist", swatches: ["#c0e8f9", "#b8d3d1", "#ce7b91", "#635255", "#1a281f"] },
  { id: "pacific", name: "Pacific", swatches: ["#61a0af", "#96c9dc", "#f06c9b", "#f9b9b7", "#f5d491"] },
  { id: "periwinkle", name: "Periwinkle", swatches: ["#e3d7ff", "#afa2ff", "#7a89c2", "#72788d", "#636b61"] },
  { id: "grape-soda", name: "Grape soda", swatches: ["#88498f", "#779fa1", "#e0cba8", "#ff6542", "#564154"] },
  { id: "amethyst", name: "Amethyst", swatches: ["#99d5c9", "#6c969d", "#645e9d", "#392b58", "#2d0320"] },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "orchard";

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

// Workspaces for colours: Journey home counts as its own, and so do the
// Wishlist inside Money and Goals and Achievements inside Growth.
export const PALETTE_WORKSPACES = ["home", "learning", "growth", "goals", "fitness", "money", "wishlist"] as const;
export type PaletteWorkspace = (typeof PALETTE_WORKSPACES)[number];

export const WORKSPACE_NAMES: Record<PaletteWorkspace, string> = {
  home: "Journey home",
  learning: "Learning",
  growth: "Growth",
  goals: "Goals and Achievements",
  fitness: "Fitness",
  money: "Money",
  wishlist: "Wishlist",
};

/** The palettes each workspace offers; the first is its default. */
export const WORKSPACE_PALETTES: Record<PaletteWorkspace, readonly PaletteId[]> = {
  home: ["orchard", "lagoon", "rose-mist"],
  learning: ["orchard", "lagoon", "rose-mist"],
  growth: ["orchard", "lagoon", "rose-mist"],
  goals: ["grape-soda"],
  fitness: ["amethyst"],
  money: ["pacific"],
  wishlist: ["periwinkle"],
};

// Which pages take which workspace's colours: the first matching path wins
// (a path matches itself and everything under it), and anything else is
// Learning. Journey home is "/" alone.
const WORKSPACE_PATHS: readonly [string, PaletteWorkspace][] = [
  ["/growth/goals", "goals"],
  ["/growth/achievements", "goals"],
  ["/growth", "growth"],
  ["/fitness", "fitness"],
  ["/money/wishlist", "wishlist"],
  ["/money", "money"],
];

/** The workspace a page belongs to, for its colours. */
export function paletteWorkspaceOf(pathname: string): PaletteWorkspace {
  if (pathname === "/") return "home";
  const match = WORKSPACE_PATHS.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return match ? match[1] : "learning";
}

/** Each workspace's choice, saved as {"learning": "lagoon", ...}. */
export const PALETTES_STORAGE_KEY = "palettes";
/** The single choice saved before workspaces had their own; it seeds home, Learning and Growth. */
export const LEGACY_PALETTE_KEY = "palette";

export type PaletteChoices = Partial<Record<PaletteWorkspace, PaletteId>>;

/** A workspace's palette: its saved choice if it still offers it, else its default. */
export function paletteFor(workspace: PaletteWorkspace, choices: PaletteChoices, legacy: string | null): PaletteId {
  const offered = WORKSPACE_PALETTES[workspace];
  const chosen = choices[workspace] ?? legacy;
  return offered.includes(chosen as PaletteId) ? (chosen as PaletteId) : offered[0];
}

// Runs in <head> before the first paint, so the right palette never flashes:
// the same logic as paletteWorkspaceOf and paletteFor, in plain JavaScript.
export const paletteScript = `(function(){try{
var offered=${JSON.stringify(WORKSPACE_PALETTES)};
var p=location.pathname;
var paths=${JSON.stringify(WORKSPACE_PATHS)};
var w=p==="/"?"home":"learning";
for(var i=0;i<paths.length&&p!=="/";i++)if(p===paths[i][0]||p.indexOf(paths[i][0]+"/")===0){w=paths[i][1];break}
var c={};try{c=JSON.parse(localStorage.getItem(${JSON.stringify(PALETTES_STORAGE_KEY)})||"{}")||{}}catch(e){}
var v=c[w]||localStorage.getItem(${JSON.stringify(LEGACY_PALETTE_KEY)});
document.documentElement.setAttribute("data-palette",offered[w].indexOf(v)>=0?v:offered[w][0]);
}catch(e){}})()`;
