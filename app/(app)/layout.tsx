import { Suspense } from "react";
import { AppHeader, AppHeaderSkeleton } from "@/components/layout/app-header";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <Suspense fallback={<AppHeaderSkeleton />}>
        <AppHeader />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
