import type { Theme } from "@/types/models";

/**
 * Theme = the user's choice (system | light | dark), stored per device in
 * localStorage and mirrored to preferences.theme on the server.
 * Resolved theme = light | dark, written to <html data-theme> so `dark:`
 * utilities and CSS tokens follow it (see app/globals.css).
 */
export const THEME_STORAGE_KEY = "paisa-theme";
const CHANGE_EVENT = "paisa-theme-change";

export type ResolvedTheme = "light" | "dark";

/** Runs inline in <head> before first paint, so there's no flash of the wrong theme. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? systemTheme() : theme;
}

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

/** Change the theme on this device. `persist` also saves it to the user's preferences. */
export function setTheme(theme: Theme, { persist = false }: { persist?: boolean } = {}) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode: still applies for this page */
  }
  apply(resolveTheme(theme));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  if (persist) {
    void fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    }).catch(() => {});
  }
}

/** useSyncExternalStore subscription: explicit changes, other tabs, and OS flips while on "system". */
export function subscribeTheme(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (readStoredTheme() === "system") apply(systemTheme());
    onChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY) return;
    apply(resolveTheme(readStoredTheme()));
    onChange();
  };
  media.addEventListener("change", onMedia);
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onMedia);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function getResolvedThemeSnapshot(): ResolvedTheme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
