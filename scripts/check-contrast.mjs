// Checks every palette in src/app/globals.css, in light and dark mode:
// - every palette defines every role token in both modes,
// - text pairs reach WCAG AA 4.5:1, and buttons, focus rings and chart
//   colours reach 3:1 against the surfaces they sit on,
// - chart colours stay distinguishable from each other, also for
//   colour-blind viewers (protanopia, deuteranopia, tritanopia).
// Run with: npm run check:contrast

import fs from "node:fs";

const css = fs.readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const registry = fs.readFileSync(new URL("../src/lib/palettes.ts", import.meta.url), "utf8");

const ROLE_TOKENS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "heading",
  "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground",
  "accent", "accent-foreground", "highlight", "highlight-foreground", "destructive", "border", "input", "ring",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "shadow-rgb",
];

// Text pairs: [text, surface].
const TEXT_PAIRS = [
  ["foreground", "background"], ["foreground", "card"], ["foreground", "muted"], ["foreground", "accent"],
  ["card-foreground", "card"], ["popover-foreground", "popover"],
  ["heading", "background"], ["heading", "card"],
  ["primary-foreground", "primary"], ["secondary-foreground", "secondary"],
  ["muted-foreground", "background"], ["muted-foreground", "card"], ["muted-foreground", "muted"],
  ["accent-foreground", "accent"], ["highlight-foreground", "highlight"],
  ["destructive", "background"], ["destructive", "card"],
  // Feedback and tag colours, which stay the same in every palette.
  ...["sunflower", "success", "info", "coral"].flatMap((c) => [
    [`${c}-foreground`, `${c}-soft`], [`${c}-foreground`, "card"], [`${c}-foreground`, "background"],
  ]),
  ...[1, 2, 3, 4, 5, 6].map((n) => [`tag-${n}-foreground`, `tag-${n}`]),
];

// Non-text pairs (buttons, rings, icons, chart marks): 3:1.
const UI_PAIRS = [
  ["primary", "background"], ["primary", "card"], ["ring", "background"], ["ring", "card"],
  ["sunflower-foreground", "sunflower"], ["white", "success"], ["success", "card"], ["info", "card"],
  ...[1, 2, 3, 4, 5].map((n) => [`chart-${n}`, "card"]),
];

// --- Colour maths -----------------------------------------------------------

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = (x) => Math.min(1, Math.max(0, x));

function oklchToRgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => clamp(toGamma(clamp(c))));
}

function oklab([r, g, b]) {
  const [R, G, B] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const luminance = ([r, g, b]) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Machado et al. (2009) full-severity matrices, applied in linear RGB.
const CVD = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

function simulate(rgb, matrix) {
  const lin = rgb.map(toLinear);
  return matrix.map((row) => clamp(toGamma(clamp(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]))));
}

const distance = (a, b) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]));

// --- Parsing ----------------------------------------------------------------

// Top-level rule blocks only (skips comments, @theme and @layer).
const blocks = new Map();
const withoutAt = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@(theme|layer)[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, "");
for (const match of withoutAt.matchAll(/([^{}]+?)\{([^{}]*)\}/g)) {
  // Drop any @import or @custom-variant lines before the selector.
  const selector = match[1].split(";").pop().trim();
  const decls = blocks.get(selector) ?? {};
  for (const d of match[2].replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    decls[d[1]] = d[2].trim();
  }
  blocks.set(selector, decls);
}

const ids = [...registry.matchAll(/id:\s*"([\w-]+)"/g)].map((m) => m[1]);
if (ids.length === 0) throw new Error("No palettes found in src/lib/palettes.ts");

function tokens(id, dark) {
  const base = id === ids[0];
  const light = blocks.get(base ? ":root" : `:root[data-palette="${id}"]`);
  const darkBlock = blocks.get(base ? ".dark" : `.dark[data-palette="${id}"]`);
  return { light, darkBlock, merged: { ...blocks.get(":root"), ...light, ...(dark ? { ...blocks.get(".dark"), ...darkBlock } : {}) } };
}

function parseColor(value, vars, seen = new Set()) {
  value = value.trim();
  const ref = value.match(/^var\(--([\w-]+)\)$/);
  if (ref) {
    if (seen.has(ref[1]) || !(ref[1] in vars)) return null;
    return parseColor(vars[ref[1]], vars, new Set([...seen, ref[1]]));
  }
  if (value === "white") return [1, 1, 1];
  const hex = value.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16) / 255);
  const ok = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (ok) return oklchToRgb(+ok[1], +ok[2], +ok[3]);
  return null;
}

// --- Checks -----------------------------------------------------------------

const failures = [];
let checked = 0;

// Workspace themes ([data-workspace="<id>"] and .dark [data-workspace="<id>"])
// sit on top of the base palette, so check them the same way.
const workspaces = [...blocks.keys()].map((k) => k.match(/^\[data-workspace="([\w-]+)"\]$/)?.[1]).filter(Boolean);
const themes = [
  ...ids.flatMap((id) => [false, true].map((dark) => {
    const { light, darkBlock, merged } = tokens(id, dark);
    return { id, dark, own: dark ? darkBlock : light, merged, adjacentOnly: false };
  })),
  ...workspaces.flatMap((w) => [false, true].map((dark) => {
    const ws = blocks.get(`[data-workspace="${w}"]`);
    const wsDark = blocks.get(`.dark [data-workspace="${w}"]`);
    const merged = { ...blocks.get(":root"), ...(dark ? blocks.get(".dark") : {}), ...ws, ...(dark ? wsDark : {}) };
    // A workspace's chart colours are its chart series, used in a fixed order,
    // so neighbours in that order are the pairs that must stay apart.
    return { id: `workspace ${w}`, dark, own: dark ? wsDark : ws, merged, adjacentOnly: true };
  })),
];

for (const { id, dark, own, merged, adjacentOnly } of themes) {
  {
    const mode = dark ? "dark" : "light";
    if (!own) {
      failures.push(`${id} ${mode}: no CSS block`);
      continue;
    }
    for (const t of ROLE_TOKENS) if (!(t in own)) failures.push(`${id} ${mode}: missing --${t}`);

    const color = (name) => parseColor(name === "white" ? "white" : (merged[name] ?? ""), merged);
    for (const [pairs, min] of [[TEXT_PAIRS, 4.5], [UI_PAIRS, 3]]) {
      for (const [fg, bg] of pairs) {
        const a = color(fg);
        const b = color(bg);
        if (!a || !b) {
          failures.push(`${id} ${mode}: can't read --${a ? bg : fg} (${merged[a ? bg : fg]})`);
          continue;
        }
        checked++;
        const ratio = contrast(a, b);
        if (ratio < min) failures.push(`${id} ${mode}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
      }
    }

    const charts = [1, 2, 3, 4, 5].map((n) => color(`chart-${n}`));
    if (charts.every(Boolean)) {
      for (const [vision, matrix] of [["normal", null], ...Object.entries(CVD)]) {
        const seen = charts.map((c) => (matrix ? simulate(c, matrix) : c));
        const min = vision === "normal" ? 0.1 : 0.05;
        for (let i = 0; i < 5; i++) {
          for (let j = i + 1; j < (adjacentOnly ? Math.min(i + 2, 5) : 5); j++) {
            checked++;
            const d = distance(seen[i], seen[j]);
            if (d < min) {
              failures.push(`${id} ${mode}: chart-${i + 1} and chart-${j + 1} look alike (${vision}, ΔE ${d.toFixed(3)} < ${min})`);
            }
          }
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.log(failures.join("\n"));
  console.log(`\n${failures.length} problem(s) in ${ids.length} palettes.`);
  process.exit(1);
}
console.log(`All ${checked} checks pass across ${ids.length} palettes and ${workspaces.length} workspace theme(s) × light and dark.`);
