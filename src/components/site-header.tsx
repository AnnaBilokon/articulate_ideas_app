"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookA,
  CalendarCheck,
  CalendarRange,
  Check,
  ChevronDown,
  Feather,
  Gem,
  GraduationCap,
  House,
  LayoutDashboard,
  Library,
  ListChecks,
  Mic,
  PiggyBank,
  Receipt,
  Plus,
  Sprout,
  Target,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AppearanceMenu } from "@/components/appearance-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const APP_NAME = "My Self Journey";

type NavItem = { href: string; label: string; icon: LucideIcon };

// The app's workspaces, each with its own tabs. A page belongs to the
// workspace whose prefixes match its path; Learning takes the rest.
// A workspace can also be wide (dashboards) and have its own colours: its
// header and layout carry data-workspace, themed in globals.css.
const workspaces: {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  prefixes: string[];
  nav: NavItem[];
  wide?: boolean;
}[] = [
  {
    id: "learning",
    label: "Learning",
    href: "/learn",
    icon: GraduationCap,
    prefixes: [],
    nav: [
      { href: "/learn", label: "Today", icon: CalendarCheck },
      { href: "/library", label: "Library", icon: Library },
      { href: "/vocabulary", label: "Vocabulary", icon: BookA },
      { href: "/speaking", label: "Speaking", icon: Mic },
    ],
  },
  {
    id: "growth",
    label: "Growth",
    href: "/growth/goals",
    icon: Sprout,
    prefixes: ["/growth"],
    nav: [
      { href: "/growth/goals", label: "Goals", icon: Target },
      { href: "/growth/habits", label: "Habits", icon: ListChecks },
      { href: "/growth/achievements", label: "Achievements", icon: Trophy },
      { href: "/growth/strengths", label: "Strengths", icon: Gem },
      { href: "/growth/beliefs", label: "Beliefs", icon: Feather },
    ],
  },
  {
    id: "money",
    label: "Money",
    href: "/money",
    icon: Wallet,
    prefixes: ["/money"],
    wide: true,
    nav: [
      { href: "/money", label: "Overview", icon: LayoutDashboard },
      { href: "/money/spending", label: "Spending", icon: Receipt },
      { href: "/money/months", label: "Months", icon: CalendarRange },
      { href: "/money/trends", label: "Trends", icon: BarChart3 },
      { href: "/money/savings", label: "Savings", icon: PiggyBank },
    ],
  },
];

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** The tab for a page: the longest one that matches, so /money/months isn't also Overview. */
const activeTab = (pathname: string, nav: NavItem[]) =>
  nav.filter((item) => matches(pathname, item.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;

function currentWorkspace(pathname: string) {
  if (pathname === "/") return null;
  return workspaces.find((w) => w.prefixes.some((p) => matches(pathname, p))) ?? workspaces[0];
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight whitespace-nowrap", className)}>
      <LogoMark />
      {/* Compact: icon only on phones, so the header stays on one line. */}
      <span className={cn(compact && "max-sm:sr-only")}>{APP_NAME}</span>
    </span>
  );
}

function LogoMark() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-logo text-logo-foreground shadow-sm">
      <Sprout className="size-4.5" />
    </span>
  );
}

// The logo opens the workspace menu: Journey home and each workspace.
function WorkspaceMenu({ current }: { current: (typeof workspaces)[number] | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${current?.label ?? APP_NAME}: switch workspace`}
        className="-ml-1 flex items-center gap-1.5 rounded-xl p-1 pr-1.5 font-semibold tracking-tight whitespace-nowrap transition-colors hover:bg-accent data-popup-open:bg-accent"
      >
        <LogoMark />
        {/* The name from 768px up; on narrower screens the tabs need the room. */}
        <span className="max-md:sr-only">{current?.label ?? APP_NAME}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent data-workspace={current?.id} align="start" className="w-52">
        <DropdownMenuItem render={<Link href="/" />}>
          <House />
          Journey home
          {!current && <Check className="ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} render={<Link href={w.href} />}>
              <w.icon />
              {w.label}
              {current?.id === w.id && <Check className="ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const tabClass = (active: boolean) =>
  cn(
    "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors hover:bg-accent hover:text-accent-foreground max-sm:px-2",
    active
      ? "bg-highlight text-highlight-foreground hover:bg-highlight hover:text-highlight-foreground"
      : "text-muted-foreground",
  );

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  const current = currentWorkspace(pathname);
  // Journey home lists the workspaces; inside one, its tabs.
  const nav = current?.nav ?? workspaces.map(({ href, label, icon }) => ({ href, label, icon }));
  const active = current ? activeTab(pathname, nav) : undefined;

  return (
    <header data-workspace={current?.id} className="sticky top-0 z-10 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex h-16 w-full items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6",
          current?.wide ? "max-w-5xl" : "max-w-3xl",
        )}
      >
        <WorkspaceMenu current={current} />
        <nav className="flex items-center gap-1 text-sm">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={href === active ? "page" : undefined}
              className={tabClass(href === active)}
            >
              {/* Icons on phones, words from tablet width up. */}
              <Icon className="size-4.5 sm:hidden" />
              <span className="max-sm:sr-only">{label}</span>
            </Link>
          ))}
          {current?.id === "learning" && (
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
          )}
          <AppearanceMenu />
        </nav>
      </div>
    </header>
  );
}
