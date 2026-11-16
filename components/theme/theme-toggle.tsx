"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useHydrated } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { hueStyle } from "@/lib/color";
import { getResolvedThemeSnapshot, readStoredTheme, setTheme, subscribeTheme, type ResolvedTheme } from "@/lib/theme";
import type { Theme } from "@/types/models";

/** Current choice (system | light | dark). Server snapshot is "system". */
export function useThemeChoice(): Theme {
  return useSyncExternalStore(subscribeTheme, readStoredTheme, () => "system");
}

/** What's on screen right now (light | dark). */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeTheme, getResolvedThemeSnapshot, () => "light");
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/** Three-way segmented control for the preferences page. */
export function ThemeSegmented({ onChange }: { onChange?: (theme: Theme) => void }) {
  const choice = useThemeChoice();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border border-line bg-raised p-1" data-testid="theme-segmented">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setTheme(value, { persist: true });
              onChange?.(value);
            }}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:h-11",
              active ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink"
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Compact header button: flips between light and dark (an explicit choice). */
export function ThemeToggleButton() {
  const resolved = useResolvedTheme();
  // Until hydration the click has no handler: say so (aria-disabled), without a visual flicker.
  const hydrated = useHydrated();
  const next: ResolvedTheme = resolved === "dark" ? "light" : "dark";
  const label = `Switch to ${next} theme`;
  return (
    <button
      type="button"
      onClick={() => hydrated && setTheme(next, { persist: true })}
      aria-disabled={!hydrated || undefined}
      aria-label={label}
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:size-11"
      data-testid="theme-toggle"
    >
      {/* Sun in the yellow hue (shown on dark), moon in violet (shown on light). */}
      <span className="cat flex text-[var(--cat)]" style={hueStyle(resolved === "dark" ? 4 : 7)}>
        {resolved === "dark" ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
      </span>
    </button>
  );
}
