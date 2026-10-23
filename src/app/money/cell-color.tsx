"use client";

import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { moneyColors, type MoneyColor } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// A small dot on an amount that opens the colours, each with its name.
// The menu carries the Money theme, since it opens outside the page.
export function CellColorPicker({
  value,
  onChange,
  labels,
  label,
  className,
}: {
  value: MoneyColor | null;
  onChange: (color: MoneyColor | null) => void;
  labels: Record<MoneyColor, string>;
  /** What's being coloured, for screen readers: "Food: actual". */
  label: string;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={value ? `${label}: colour ${labels[value]}. Change colour` : `${label}: add a colour`}
        title={value ? labels[value] : "Add a colour"}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <span
          className={cn("size-3 rounded-full", value ? "ring-2 ring-black/45" : "border border-dashed border-foreground/35")}
          style={value ? { background: `var(--cell-${value})` } : undefined}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent data-workspace="money" align="start" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Colour</DropdownMenuLabel>
          {moneyColors.map((c) => (
            <DropdownMenuItem key={c} onClick={() => onChange(c)} className="gap-2">
              <span className="size-3.5 rounded-full ring-1 ring-foreground/25" style={{ background: `var(--cell-${c})` }} />
              <span className="flex-1 truncate">{labels[c]}</span>
              {value === c && <Check className="size-3.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange(null)} disabled={!value} className="text-muted-foreground">
          No colour
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
