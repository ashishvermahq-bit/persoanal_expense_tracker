"use client";

import { useState } from "react";

/**
 * Renders `children` and replays a 0.3s scale + green flash whenever `value`
 * changes after mount (e.g. router.refresh() after saving an expense).
 * First render is static. Remounting the keyed span restarts the animation.
 */
export function ValuePop({ value, children }: { value: number; children: React.ReactNode }) {
  const [initial] = useState(value);
  const changed = value !== initial;
  return (
    <span key={value} className={changed ? "inline-block origin-left animate-value-pop" : undefined}>
      {children}
    </span>
  );
}
