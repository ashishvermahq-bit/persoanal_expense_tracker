"use client";

import { CircleCheck } from "lucide-react";
import { Toaster } from "sonner";
import { useResolvedTheme } from "./theme-toggle";

/** Sonner, following the app theme, with the animated success tick. */
export function AppToaster() {
  const theme = useResolvedTheme();
  return (
    <Toaster
      theme={theme}
      position="top-center"
      duration={3000}
      richColors
      closeButton
      icons={{ success: <CircleCheck className="size-5 animate-check-pop" aria-hidden /> }}
      offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
    />
  );
}
