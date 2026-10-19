"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookA, House, Library, Plus, Sprout } from "lucide-react";
import { AppearanceMenu } from "@/components/appearance-menu";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Today", icon: House },
  { href: "/library", label: "Library", icon: Library },
  { href: "/vocabulary", label: "Vocabulary", icon: BookA },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight whitespace-nowrap", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-logo text-logo-foreground shadow-sm">
        <Sprout className="size-4.5" />
      </span>
      {/* Compact: icon only on phones, so the header stays on one line. */}
      <span className={cn(compact && "max-sm:sr-only")}>Learning Coach</span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Learning Coach home">
          <Logo compact />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-colors hover:bg-accent hover:text-accent-foreground max-sm:px-2.5",
                isActive(pathname, href)
                  ? "bg-highlight text-highlight-foreground hover:bg-highlight hover:text-highlight-foreground"
                  : "text-muted-foreground",
              )}
            >
              {/* Icons on phones, words from tablet width up. */}
              <Icon className="size-4.5 sm:hidden" />
              <span className="max-sm:sr-only">{label}</span>
            </Link>
          ))}
          <Link
            href="/topics/new"
            className={cn(
              "ml-1 flex items-center gap-1 rounded-full bg-primary whitespace-nowrap px-3.5 py-1.5 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 max-sm:px-2",
              pathname === "/topics/new" && "ring-2 ring-ring/40",
            )}
          >
            <Plus className="size-4" />
            {/* Icon only on phones, so the header stays on one line. */}
            <span className="max-sm:sr-only">New topic</span>
          </Link>
          <AppearanceMenu />
        </nav>
      </div>
    </header>
  );
}
