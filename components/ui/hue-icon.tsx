import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { hueStyle, type Hue } from "@/lib/color";

/**
 * A Lucide icon in a series hue on an 18% tint of the same hue (the same look
 * as CategoryIcon), contrast-safe in both themes via hueStyle(). Decorative.
 */
export function HueIcon({ icon: Icon, hue, size = "md", className }: { icon: LucideIcon; hue: Hue; size?: "xs" | "sm" | "md"; className?: string }) {
  const dims = size === "xs" ? "size-6 [&>svg]:size-3.5" : size === "sm" ? "size-7 [&>svg]:size-3.5" : "size-9 [&>svg]:size-4";
  return (
    <span aria-hidden className={cn("cat cat-icon inline-flex shrink-0 items-center justify-center rounded-full", dims, className)} style={hueStyle(hue)}>
      <Icon />
    </span>
  );
}
