import type { Metadata } from "next";
import { Suspense } from "react";
import { BudgetsGlance, DashboardEmpty, HeroCard, InsightChips, RecentActivity, TopCategories, UpcomingList } from "@/components/dashboard/glance";
import { TrendsPanel } from "@/components/dashboard/trends-panel";
import { Skeleton } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDateLong, todayIST } from "@/lib/dates";
import { requireUserId } from "@/lib/services/context";
import { listUpcoming, loadGlance, loadTrends } from "@/lib/services/dashboard";
import { listExpenses } from "@/lib/services/expenses";
import { expenseFiltersSchema } from "@/lib/validation/expense";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Glance first, details on tap. In 3 seconds: how much have I spent (hero),
 * am I on track (safe-to-spend, pace, budgets), what needs attention (chips).
 * Each section streams in its own Suspense with a skeleton of its real size.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <Suspense fallback={<Skeleton className="h-11 w-56" />}>
        <Greeting />
      </Suspense>
      <Suspense fallback={<GlanceSkeleton />}>
        <Glance />
      </Suspense>
    </div>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  return (
    <div>
      <p className="text-xs text-ink-3">{formatDateLong(todayIST())}</p>
      <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl" data-testid="greeting">
        Namaste, {user?.name.split(" ")[0]}
      </h1>
    </div>
  );
}

async function Glance() {
  const userId = await requireUserId();
  const [g, recent] = await Promise.all([
    loadGlance(userId.toHexString()),
    listExpenses(userId, expenseFiltersSchema.parse({ pageSize: 5 })),
  ]);
  const hasAny = recent.total > 0;

  return (
    <div className="space-y-5">
      <HeroCard g={g} />
      {hasAny ? (
        <>
          <InsightChips g={g} />
          <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
            {/* DOM order = phone order (budgets before recent); desktop places them side by side. */}
            <div className="space-y-5 lg:col-start-2 lg:row-start-1">
              <BudgetsGlance g={g} />
              <Suspense fallback={null}>
                <Upcoming />
              </Suspense>
            </div>
            <div className="space-y-5 lg:col-start-1 lg:row-start-1">
              <TopCategories g={g} />
              <RecentActivity items={recent.items} />
            </div>
          </div>
          <Suspense fallback={<Skeleton className="h-14" />}>
            <Trends />
          </Suspense>
        </>
      ) : (
        <>
          <DashboardEmpty />
          <Suspense fallback={null}>
            <Upcoming />
          </Suspense>
        </>
      )}
    </div>
  );
}

async function Upcoming() {
  const userId = await requireUserId();
  return <UpcomingList items={await listUpcoming(userId)} />;
}

async function Trends() {
  const userId = await requireUserId();
  return <TrendsPanel periods={await loadTrends(userId)} />;
}

function GlanceSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <Skeleton className="h-[196px] rounded-2xl" />
      <div className="flex gap-2 overflow-hidden">
        <Skeleton className="h-11 w-40 shrink-0 rounded-full" />
        <Skeleton className="h-11 w-48 shrink-0 rounded-full" />
        <Skeleton className="h-11 w-36 shrink-0 rounded-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Skeleton className="h-64 lg:col-start-2 lg:row-start-1" />
        <Skeleton className="h-80 lg:col-start-1 lg:row-start-1" />
      </div>
    </div>
  );
}
