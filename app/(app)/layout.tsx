import { Suspense } from "react";
import { AppHeader, AppHeaderSkeleton } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-plane">
      <Suspense fallback={<AppHeaderSkeleton />}>
        <AppHeader />
      </Suspense>
      {/* Bottom padding clears the 64px mobile nav, its floating FAB and the home-bar inset. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-10">{children}</main>
      {/* usePathname() is request-time data; with cacheComponents it must sit under Suspense. */}
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
    </div>
  );
}
