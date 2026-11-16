import { Suspense } from "react";
import { QuickAddSheetLoader } from "@/components/expenses/quick-add-sheet-loader";
import { AppHeader, AppHeaderSkeleton } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-plane">
      <Suspense fallback={<AppHeaderSkeleton />}>
        <AppHeader />
      </Suspense>
      {/* Bottom padding clears the 64px mobile nav, its floating FAB and the home-bar inset. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-10 sm:pt-6">{children}</main>
      {/* usePathname() is request-time data; with cacheComponents it must sit under Suspense. */}
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
      {/* Global quick-add bottom sheet; until it loads, "Add" links go to /add. */}
      <Suspense fallback={null}>
        <QuickAddSheetLoader />
      </Suspense>
    </div>
  );
}
