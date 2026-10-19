"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Monitor, Moon, Settings, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePalette } from "@/hooks/use-palette";
import { PALETTES, isPaletteId } from "@/lib/palettes";

export const MODES = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

// A palette's source colours as small overlapping circles.
export function PaletteDots({ swatches }: { swatches: readonly string[] }) {
  return (
    <span className="flex -space-x-1" aria-hidden>
      {swatches.map((color) => (
        <span key={color} className="size-3.5 rounded-full ring-2 ring-popover" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}

export function AppearanceMenu() {
  const { theme, setTheme } = useTheme();
  const [palette, setPalette] = usePalette();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Mode and colours"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground"
      >
        {/* Swapped by CSS, so the right icon shows before hydration. */}
        <Sun className="size-4.5 dark:hidden" />
        <Moon className="hidden size-4.5 dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mode</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(value) => setTheme(String(value))}>
            {MODES.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Colours</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={palette ?? ""}
            onValueChange={(value) => {
              if (isPaletteId(value)) setPalette(value);
            }}
          >
            {PALETTES.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id} className="gap-2.5">
                <PaletteDots swatches={p.swatches} />
                {p.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />} className="text-muted-foreground">
          <Settings />
          All settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
