"use client";

import { useEffect, useRef } from "react";
import { formatPaise } from "@/lib/money";

/** Set by the sign-in/sign-up forms just before the post-auth page load. */
export const WELCOME_FLAG = "paisa-welcome";

/**
 * The hero figure. Counts up from ₹0 once, only on the first dashboard view
 * after signing in (a one-time sessionStorage flag), never on ordinary
 * visits, never under reduced motion. Width is reserved by the invisible
 * final value, so nothing shifts.
 */
export function WelcomeCountUp({ paise }: { paise: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let welcome = false;
    try {
      welcome = sessionStorage.getItem(WELCOME_FLAG) === "1";
      sessionStorage.removeItem(WELCOME_FLAG);
    } catch {
      /* storage blocked: just show the number */
    }
    const el = ref.current;
    if (!welcome || !el || paise <= 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = formatPaise(t < 1 ? Math.round((paise * eased) / 100) * 100 : paise);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paise]);

  const final = formatPaise(paise);
  // Width is reserved by a pseudo-element (not real text), so the figure is read
  // once by screen readers and textContent, and counting never shifts layout.
  return (
    <span className="inline-grid">
      <span aria-hidden data-final={final} className="invisible col-start-1 row-start-1 before:content-[attr(data-final)]" />
      <span ref={ref} className="col-start-1 row-start-1">
        {final}
      </span>
    </span>
  );
}

/** Called by the auth forms right before navigating into the app. */
export function markWelcome() {
  try {
    sessionStorage.setItem(WELCOME_FLAG, "1");
  } catch {
    /* ignore */
  }
}
