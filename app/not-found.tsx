import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-plane px-4 pb-safe pt-safe">
      <div className="w-full max-w-md">
        <EmptyState
          icon={Compass}
          title="This page isn't here"
          description="The link may be old, or the entry was deleted."
          action={
            <Link href="/" className={buttonClassName("primary", "md")}>
              Go to Paisa
            </Link>
          }
        />
      </div>
    </main>
  );
}
