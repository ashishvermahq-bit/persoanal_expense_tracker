"use client";

import { useEffect, type RefObject } from "react";
import { useHydrated } from "@/components/ui/form";

/**
 * Focus the field on desktop (≥1024px with a mouse) once the form is enabled.
 * Never on phones: popping the keyboard on load hides the page.
 * Waits for hydration because <Form> keeps its fieldset disabled until then.
 */
export function useDesktopAutofocus(ref: RefObject<HTMLInputElement | null>) {
  const hydrated = useHydrated();
  useEffect(() => {
    if (!hydrated || !ref.current) return;
    if (!window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches) return;
    if (document.activeElement && document.activeElement !== document.body) return; // user already moved
    ref.current.focus();
  }, [hydrated, ref]);
}
