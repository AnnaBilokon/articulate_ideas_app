"use client";

import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import { MODES } from "@/components/appearance-menu";
import { usePalette } from "@/hooks/use-palette";
import { PALETTES, PALETTE_WORKSPACES, WORKSPACE_NAMES, WORKSPACE_PALETTES, type PaletteWorkspace } from "@/lib/palettes";
import { cn } from "@/lib/utils";

// Native radio inputs inside each option, so arrow keys and screen readers
// work as in any radio group.
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 id="mode-heading" className="font-semibold text-heading">
          Mode
        </h2>
        <div role="radiogroup" aria-labelledby="mode-heading" className="grid grid-cols-3 gap-2 sm:max-w-md">
          {MODES.map(({ value, label, icon: Icon }) => {
            const selected = theme === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  selected ? "bg-card ring-2 ring-primary" : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={selected}
                  onChange={() => setTheme(value)}
                  className="sr-only"
                />
                <Icon className="size-5" />
                {label}
              </label>
            );
          })}
        </div>
      </section>

      {PALETTE_WORKSPACES.map((w) => (
        <WorkspaceColours key={w} workspace={w} />
      ))}
    </div>
  );
}

// One workspace's palettes: each workspace keeps its own colours.
function WorkspaceColours({ workspace }: { workspace: PaletteWorkspace }) {
  const [palette, setPalette] = usePalette(workspace);
  const offered = PALETTES.filter((p) => WORKSPACE_PALETTES[workspace].includes(p.id));
  const heading = `palette-heading-${workspace}`;
  return (
    <section className="flex flex-col gap-3">
      <h2 id={heading} className="font-semibold text-heading">
        Colours for {WORKSPACE_NAMES[workspace]}
      </h2>
      <div role="radiogroup" aria-labelledby={heading} className="grid gap-3 sm:grid-cols-3">
        {offered.map((p) => {
          const selected = palette === p.id;
          return (
            <label
              key={p.id}
              className={cn(
                "flex cursor-pointer flex-col gap-3 rounded-xl p-3 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                selected ? "bg-card shadow-sm ring-2 ring-primary" : "bg-muted/60 hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name={`palette-${workspace}`}
                value={p.id}
                checked={selected}
                onChange={() => setPalette(p.id)}
                className="sr-only"
              />
              <span className="flex h-12 overflow-hidden rounded-lg" aria-hidden>
                {p.swatches.map((color) => (
                  <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </span>
              <span className="flex items-center justify-between gap-2 text-sm font-medium">
                {p.name}
                {selected && <Check className="size-4 text-primary" />}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
