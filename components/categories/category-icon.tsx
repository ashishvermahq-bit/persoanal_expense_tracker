import {
  Baby,
  Book,
  Briefcase,
  Bus,
  Car,
  CircleEllipsis,
  Clapperboard,
  Coffee,
  CreditCard,
  Dog,
  Droplets,
  Dumbbell,
  Flame,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandHelping,
  HeartHandshake,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Music,
  PiggyBank,
  Pill,
  Plane,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Tv,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

/** Static map keeps the bundle bounded and works in Server Components. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "shopping-basket": ShoppingBasket,
  home: Home,
  landmark: Landmark,
  zap: Zap,
  wifi: Wifi,
  fuel: Fuel,
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "shield-check": ShieldCheck,
  "trending-up": TrendingUp,
  "hand-helping": HandHelping,
  gift: Gift,
  "heart-handshake": HeartHandshake,
  clapperboard: Clapperboard,
  sparkles: Sparkles,
  "circle-ellipsis": CircleEllipsis,
  coffee: Coffee,
  plane: Plane,
  bus: Bus,
  baby: Baby,
  dog: Dog,
  dumbbell: Dumbbell,
  book: Book,
  music: Music,
  "gamepad-2": Gamepad2,
  wrench: Wrench,
  scissors: Scissors,
  pill: Pill,
  briefcase: Briefcase,
  "piggy-bank": PiggyBank,
  wallet: Wallet,
  "credit-card": CreditCard,
  smartphone: Smartphone,
  laptop: Laptop,
  tv: Tv,
  droplets: Droplets,
  flame: Flame,
  tag: Tag,
};

export const ICON_NAMES = Object.keys(CATEGORY_ICONS);

export const CATEGORY_COLORS = [
  "#16a34a", "#0d9488", "#0ea5e9", "#2563eb", "#4f46e5", "#7c3aed", "#c026d3", "#db2777",
  "#e11d48", "#dc2626", "#ea580c", "#f59e0b", "#a16207", "#64748b",
];

export function CategoryIcon({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: string | null | undefined;
  color: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Tag;
  const bg = color ?? "#64748b";
  const dims = size === "sm" ? "size-7 [&>svg]:size-3.5" : size === "lg" ? "size-12 [&>svg]:size-6" : "size-9 [&>svg]:size-4";
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", dims, className)}
      style={{ backgroundColor: `${bg}1f`, color: bg }}
    >
      <Icon />
    </span>
  );
}
