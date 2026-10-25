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
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "orchard";

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

// Workspaces for colours: Journey home counts as its own.
export const PALETTE_WORKSPACES = ["home", "learning", "growth", "money"] as const;
export type PaletteWorkspace = (typeof PALETTE_WORKSPACES)[number];

export const WORKSPACE_NAMES: Record<PaletteWorkspace, string> = {
  home: "Journey home",
  learning: "Learning",
  growth: "Growth",
  money: "Money",
};

/** The palettes each workspace offers; the first is its default. */
export const WORKSPACE_PALETTES: Record<PaletteWorkspace, readonly PaletteId[]> = {
  home: ["orchard", "lagoon", "rose-mist"],
  learning: ["orchard", "lagoon", "rose-mist"],
  growth: ["orchard", "lagoon", "rose-mist"],
  money: ["pacific"],
};

/** The workspace a page belongs to, for its colours. */
export function paletteWorkspaceOf(pathname: string): PaletteWorkspace {
  if (pathname === "/") return "home";
  if (pathname === "/growth" || pathname.startsWith("/growth/")) return "growth";
  if (pathname === "/money" || pathname.startsWith("/money/")) return "money";
  return "learning";
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
var w=p==="/"?"home":/^\\/growth(\\/|$)/.test(p)?"growth":/^\\/money(\\/|$)/.test(p)?"money":"learning";
var c={};try{c=JSON.parse(localStorage.getItem(${JSON.stringify(PALETTES_STORAGE_KEY)})||"{}")||{}}catch(e){}
var v=c[w]||localStorage.getItem(${JSON.stringify(LEGACY_PALETTE_KEY)});
document.documentElement.setAttribute("data-palette",offered[w].indexOf(v)>=0?v:offered[w][0]);
}catch(e){}})()`;
