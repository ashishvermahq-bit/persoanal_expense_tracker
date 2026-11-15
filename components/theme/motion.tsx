"use client";

import { useEffect } from "react";

/**
 * One delegated listener drives the ripple on every element marked
 * `data-ripple` (chips, list rows, nav items): no per-component state.
 * The CSS lives in app/globals.css and is disabled under reduced motion.
 */
export function MotionRoot() {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = (e.target as Element | null)?.closest<HTMLElement>("[data-ripple]");
      if (!target || target.matches(":disabled, [aria-disabled='true']")) return;
      const rect = target.getBoundingClientRect();
      const size = Math.hypot(rect.width, rect.height) * 2;
      target.style.setProperty("--ripple-x", `${e.clientX - rect.left}px`);
      target.style.setProperty("--ripple-y", `${e.clientY - rect.top}px`);
      target.style.setProperty("--ripple-size", `${size}px`);
      // Restart the animation even on rapid repeat taps.
      target.removeAttribute("data-rippling");
      void target.offsetWidth;
      target.setAttribute("data-rippling", "");
    }
    function onAnimationEnd(e: AnimationEvent) {
      if (e.animationName === "ripple") (e.target as HTMLElement).removeAttribute("data-rippling");
    }
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("animationend", onAnimationEnd);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("animationend", onAnimationEnd);
    };
  }, []);
  return null;
}
