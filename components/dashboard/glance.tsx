import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  Crown,
  FileText,
  Gauge,
  History,
  OctagonAlert,
  PieChart,
  PiggyBank,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { BudgetMeter } from "@/components/budgets/budget-meter";
import { ExpenseRowLink } from "@/components/expenses/expense-row";
import { QuickAddLink } from "@/components/expenses/quick-add-link";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, SectionLabel } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { istParts, todayIST } from "@/lib/dates";
import { CategoryIcon } from "@/components/categories/category-icon";
import { HueIcon } from "@/components/ui/hue-icon";
import { categoryStyle } from "@/lib/color";
import { computeInsights, monthQuery, safeToSpend, spendingPace, type InsightIcon, type InsightTone } from "@/lib/insights";
import { formatPaise } from "@/lib/money";
import type { Glance } from "@/lib/services/dashboard";
import type { ExpenseDTO, UpcomingDTO } from "@/types/dto";
import { ValuePop } from "./value-pop";
import { WelcomeCountUp } from "./welcome-count-up";

/* ------------------------------------------------------------------ hero */

/** How much have I spent? Am I on track? */
export function HeroCard({ g }: { g: Glance }) {
  const pace = spendingPace(g);
  const safe = safeToSpend(g);
  const progress = Math.round((g.today.day / g.daysInMonth) * 100);
  const daysLeft = g.daysInMonth - g.today.day;

  return (
    <section aria-label="This month" className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card" data-testid="hero">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/8 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-2">Spent in {g.monthLabel}</p>
        {pace && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              pace.direction === "less" ? "bg-success/10 text-success-ink" : "bg-raised text-ink-2"
            )}
            data-testid="pace-chip"
          >
            {pace.direction === "less" ? <TrendingDown className="size-3.5" aria-hidden /> : <TrendingUp className="size-3.5" aria-hidden />}
            {pace.pct}% {pace.direction} than {pace.vsLabel}
          </span>
        )}
      </div>

      {/* Hero figure: 48px on ≥sm, scales down so lakhs still fit at 390px. Proportional figures. */}
      <p className="relative mt-1 text-[clamp(2.25rem,11vw,3rem)] font-semibold leading-tight tracking-tight text-ink" data-testid="month-spent">
        <ValuePop value={g.current.totalExpensePaise}>
          <WelcomeCountUp paise={g.current.totalExpensePaise} />
        </ValuePop>
      </p>

      <p className="relative mt-1 min-h-5 text-sm text-ink-2" data-testid="safe-to-spend">
        {safe.kind === "ok" && (
          <>
            <span className="font-semibold text-ink">{formatPaise(safe.perDayPaise)}</span> a day is safe to spend
            <span className="text-ink-3"> · {formatPaise(safe.remainingPaise)} left in budgets</span>
          </>
        )}
        {safe.kind === "over" && (
          <span className="inline-flex items-center gap-1 font-medium text-danger-ink">
            <OctagonAlert className="size-4" aria-hidden />
            Budgets exceeded by {formatPaise(safe.overPaise)}
          </span>
        )}
        {safe.kind === "no-budgets" && (
          <Link href="/budgets" className="font-medium text-primary-ink underline-offset-4 hover:underline">
            Set budgets to see what&apos;s safe to spend each day
          </Link>
        )}
      </p>

      <div className="relative mt-4">
        <div className="flex justify-between text-xs text-ink-3">
          <span>
            Day {g.today.day} of {g.daysInMonth}
          </span>
          <span>{daysLeft === 0 ? "Last day" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} to go`}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-label="Month elapsed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- insights */

const INSIGHT_ICON: Record<InsightIcon, LucideIcon> = {
  budget: Gauge,
  "trend-down": TrendingDown,
  "trend-up": TrendingUp,
  biggest: Crown,
  check: CheckCircle2,
  piggy: PiggyBank,
  upi: Smartphone,
  tax: FileText,
};
const TONE: Record<InsightTone, { chip: string; icon: string }> = {
  neutral: { chip: "border-line bg-surface text-ink-2", icon: "text-primary" },
  good: { chip: "border-success/30 bg-success/10 text-success-ink", icon: "text-success-ink" },
  warning: { chip: "border-warning/40 bg-warning/10 text-warning-ink", icon: "text-warning-ink" },
  danger: { chip: "border-danger/30 bg-danger/10 text-danger-ink", icon: "text-danger-ink" },
};

/** What needs attention? 3–5 computed, true, tappable insights. */
export function InsightChips({ g }: { g: Glance }) {
  const insights = computeInsights(g);
  if (insights.length === 0) return null;
  return (
    <nav aria-label="Insights">
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {insights.map((ins, i) => {
          const Icon = INSIGHT_ICON[ins.icon];
          const tone = TONE[ins.tone];
          // About one category? Show that category's own icon + colour.
          const look = ins.categoryId ? g.categoryLook[ins.categoryId] : undefined;
          return (
            <li key={ins.id} className="shrink-0 snap-start animate-list-in" style={{ "--i": i } as React.CSSProperties}>
              <Link
                href={ins.href}
                data-ripple
                data-testid="insight-chip"
                className={cn(
                  "inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border text-sm font-medium shadow-card transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  look ? "pl-1.5 pr-3.5" : "px-3.5",
                  tone.chip
                )}
              >
                {look ? <CategoryIcon icon={look.icon} color={look.color} size="sm" /> : <Icon className={cn("size-4", tone.icon)} aria-hidden />}
                {ins.text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* -------------------------------------------------------- top categories */

/**
 * Where the money went: a thin segmented bar in each category's own colour
 * (tail folded into "Other"), then rows with icon, name, share and amount.
 * Text stays in ink; colour lives on the icons and the bar.
 */
export function TopCategories({ g }: { g: Glance }) {
  const total = g.current.totalExpensePaise;
  const sorted = [...g.current.byCategory].sort((a, b) => b.totalPaise - a.totalPaise);
  if (total <= 0 || sorted.length === 0) return null;
  const top = sorted.slice(0, 4);
  const otherPaise = sorted.slice(4).reduce((sum, c) => sum + c.totalPaise, 0);
  const share = (p: number) => Math.round((p / total) * 100);

  return (
    <Card className="p-4" data-testid="top-categories">
      <div className="flex items-center justify-between">
        <SectionLabel icon={PieChart} hue={1}>Top categories</SectionLabel>
        <span className="text-xs tabular-nums text-ink-3">{formatPaise(total)}</span>
      </div>
      {/* Thin segmented bar: no text on it; the rows below carry the figures. 2px gaps. */}
      <div className="mt-3 flex h-2 animate-grow-x gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {top.map((c) => (
          <span key={c.categoryId} className="cat h-full bg-[var(--cat)] first:rounded-l-full last:rounded-r-full" style={{ ...categoryStyle(g.categoryLook[c.categoryId]?.color), width: `${(c.totalPaise / total) * 100}%` }} />
        ))}
        {otherPaise > 0 && <span className="h-full rounded-r-full bg-muted/40" style={{ width: `${(otherPaise / total) * 100}%` }} />}
      </div>
      <ul className="mt-2 divide-y divide-line">
        {top.map((c) => {
          const look = g.categoryLook[c.categoryId];
          return (
            <li key={c.categoryId}>
              <Link
                href={monthQuery(g.today, g.daysInMonth, { categoryId: c.categoryId })}
                data-ripple
                className="-mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <CategoryIcon icon={look?.icon} color={look?.color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{c.name}</span>
                <span className="text-xs tabular-nums text-ink-3">{share(c.totalPaise)}%</span>
                <span className="w-24 text-right text-sm font-semibold tabular-nums text-ink">{formatPaise(c.totalPaise)}</span>
              </Link>
            </li>
          );
        })}
        {otherPaise > 0 && (
          <li className="flex min-h-12 items-center gap-3 py-1.5">
            <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-muted/20">
              <span className="size-2 rounded-full bg-muted" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium text-ink-2">Other ({sorted.length - 4})</span>
            <span className="text-xs tabular-nums text-ink-3">{share(otherPaise)}%</span>
            <span className="w-24 text-right text-sm font-semibold tabular-nums text-ink">{formatPaise(otherPaise)}</span>
          </li>
        )}
      </ul>
    </Card>
  );
}

/* --------------------------------------------------------------- budgets */

const STATUS_ORDER = { over: 0, warning: 1, ok: 2 } as const;

export function BudgetsGlance({ g }: { g: Glance }) {
  const sorted = [...g.budgets].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.spendPaise / b.amountPaise - a.spendPaise / a.amountPaise);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <SectionLabel icon={Gauge} hue={7}>Budgets</SectionLabel>
        <Link href="/budgets" className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary-ink hover:underline">
          {sorted.length ? "See all" : "Set up"} <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-ink-3">Set a monthly limit per category; you&apos;ll get a heads-up at 80% and when you go over.</p>
      ) : (
        <div className="divide-y divide-line">
          {sorted.slice(0, 3).map((b) => (
            <BudgetMeter key={b.categoryId} color={b.categoryColor} categoryName={b.categoryName} status={b.status} spendPaise={b.spendPaise} budgetPaise={b.amountPaise} />
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- recent */

const DAY_MS = 86_400_000;
function bucketOf(iso: string, todayMs: number): "Today" | "Yesterday" | "This week" | "Earlier" {
  const { year, month, day } = istParts(new Date(iso));
  const dayMs = Date.UTC(year, month - 1, day);
  const diff = Math.round((todayMs - dayMs) / DAY_MS);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This week";
  return "Earlier";
}

export function RecentActivity({ items }: { items: ExpenseDTO[] }) {
  const t = istParts(todayIST());
  const todayMs = Date.UTC(t.year, t.month - 1, t.day);
  const groups = new Map<string, ExpenseDTO[]>();
  for (const e of items) {
    const b = bucketOf(e.date, todayMs);
    groups.set(b, [...(groups.get(b) ?? []), e]);
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <SectionLabel icon={History} hue={2}>Recent</SectionLabel>
        <Link href="/expenses" className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary-ink hover:underline">
          All expenses <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
      <div className="space-y-3">
        {[...groups].map(([label, list]) => (
          <section key={label} aria-label={label}>
            <h3 className="px-1 pb-1 text-xs font-medium text-ink-3">{label}</h3>
            <ul className="-mx-4 divide-y divide-line border-y border-line">
              {list.map((e, i) => (
                <li key={e.id} className="animate-list-in" style={{ "--i": i } as React.CSSProperties}>
                  <ExpenseRowLink expense={e} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}

/** Brand-new month: one friendly CTA instead of a page of zeros. */
export function DashboardEmpty() {
  return (
    <EmptyState
      art="ledger"
      title="Your month starts here"
      description="Add your first expense and Paisa will show your spend, what's safe to spend each day, and what needs attention."
      action={
        <QuickAddLink className={buttonClassName("primary", "lg")}>
          <BadgeIndianRupee className="size-5" aria-hidden />
          Add an expense
        </QuickAddLink>
      }
    />
  );
}

/* -------------------------------------------------------------- upcoming */

function dueLabel(d: number) {
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `In ${d} days`;
}

export function UpcomingList({ items }: { items: UpcomingDTO[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="p-4">
      <SectionLabel className="mb-2" icon={CalendarClock} hue={5}>Upcoming</SectionLabel>
      <ul className="divide-y divide-line">
        {items.map((u) => {
          const soon = u.dueInDays <= 2;
          return (
            <li key={u.id} className="flex min-h-14 items-center gap-3 py-2" data-testid="upcoming-item">
              {u.categoryColor || u.categoryIcon ? (
                <CategoryIcon icon={u.categoryIcon} color={u.categoryColor} />
              ) : (
                <HueIcon icon={u.kind === "income" ? Wallet : CalendarClock} hue={u.kind === "income" ? 6 : 5} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{u.title}</p>
                <p className="text-xs tabular-nums text-ink-3">{formatPaise(u.amountPaise)}</p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  soon ? "bg-warning/15 text-warning-ink" : "bg-raised text-ink-2"
                )}
              >
                {soon && <CalendarClock className="size-3.5" aria-hidden />}
                {dueLabel(u.dueInDays)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
