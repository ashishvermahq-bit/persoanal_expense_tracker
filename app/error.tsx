"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Route-level error boundary. Never shows error details (only Next's opaque digest). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-plane px-4 pb-safe pt-safe">
      <div className="w-full max-w-md">
        <EmptyState
          icon={TriangleAlert}
          title="Something went wrong"
          description={`Your data is safe. Try again in a moment.${error.digest ? ` (Ref: ${error.digest})` : ""}`}
          action={
            <Button onClick={reset}>
              <RotateCcw className="size-4" aria-hidden />
              Try again
            </Button>
          }
        />
      </div>
    </main>
  );
}
