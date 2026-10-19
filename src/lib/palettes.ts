// Colour palettes the learner can pick. Each palette's light and dark tokens
// live in src/app/globals.css; the comment above the palette blocks there
// says how to add one. The first palette is the base one (on :root and .dark).

export const PALETTES = [
  { id: "orchard", name: "Orchard", swatches: ["#f3f9d2", "#cbeaa6", "#c0d684", "#63264a", "#3d0b37"] },
  { id: "lagoon", name: "Lagoon", swatches: ["#dbfe87", "#03b5aa", "#b2aa8e", "#7a306c", "#0c1b33"] },
  { id: "rose-mist", name: "Rose mist", swatches: ["#c0e8f9", "#b8d3d1", "#ce7b91", "#635255", "#1a281f"] },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "orchard";

export const PALETTE_STORAGE_KEY = "palette";

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

// Runs in <head> before the first paint, so a saved palette never flashes the
// default one. Falls back to the default for a missing or unknown value.
export const paletteScript = `(function(){try{var ids=${JSON.stringify(PALETTES.map((p) => p.id))};var p=localStorage.getItem(${JSON.stringify(PALETTE_STORAGE_KEY)});document.documentElement.setAttribute("data-palette",ids.indexOf(p)>=0?p:${JSON.stringify(DEFAULT_PALETTE)})}catch(e){}})()`;
