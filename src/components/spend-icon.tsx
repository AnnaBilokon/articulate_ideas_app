import {
  Baby,
  Bike,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Cookie,
  Film,
  Flower2,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Music,
  Palette,
  PartyPopper,
  PawPrint,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Puzzle,
  Scissors,
  Shirt,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Ticket,
  TrainFront,
  Tv,
  Dumbbell,
  UtensilsCrossed,
  Wifi,
  Wine,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { SpendColor, SpendIcon } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export const spendIconComponents: Record<SpendIcon, LucideIcon> = {
  cart: ShoppingCart,
  basket: ShoppingBasket,
  utensils: UtensilsCrossed,
  coffee: Coffee,
  pizza: Pizza,
  cookie: Cookie,
  wine: Wine,
  bus: Bus,
  train: TrainFront,
  car: Car,
  fuel: Fuel,
  bike: Bike,
  plane: Plane,
  home: House,
  sofa: Sofa,
  zap: Zap,
  wifi: Wifi,
  smartphone: Smartphone,
  tv: Tv,
  shirt: Shirt,
  gem: Gem,
  scissors: Scissors,
  sparkles: Sparkles,
  "heart-pulse": HeartPulse,
  pill: Pill,
  dumbbell: Dumbbell,
  baby: Baby,
  toy: Puzzle,
  paw: PawPrint,
  graduation: GraduationCap,
  book: BookOpen,
  film: Film,
  music: Music,
  gamepad: Gamepad2,
  ticket: Ticket,
  palette: Palette,
  gift: Gift,
  party: PartyPopper,
  flower: Flower2,
  briefcase: Briefcase,
  wrench: Wrench,
  piggy: PiggyBank,
};

/** A category's icon in a circle of its colour. */
export function SpendIconBadge({ icon, color, size = "md", className }: { icon: SpendIcon; color: SpendColor; size?: "sm" | "md" | "lg"; className?: string }) {
  const Icon = spendIconComponents[icon];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "sm" ? "size-7" : size === "lg" ? "size-11" : "size-9",
        className,
      )}
      style={{ background: `var(--spend-${color})`, color: `var(--spend-${color}-foreground)` }}
      aria-hidden
    >
      <Icon className={size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4.5"} />
    </span>
  );
}
