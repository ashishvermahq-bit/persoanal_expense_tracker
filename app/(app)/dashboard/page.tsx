import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDateLong, todayIST } from "@/lib/dates";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
      <Greeting />
    </Suspense>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatDateLong(todayIST())}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50" data-testid="greeting">
        Namaste, {user?.name.split(" ")[0]}
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Your dashboard will fill up once you add expenses. Phase 3 brings the quick-add form and expense list.
      </p>
    </section>
  );
}
