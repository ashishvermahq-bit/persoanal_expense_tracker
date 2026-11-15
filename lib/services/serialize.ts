import type { Types } from "mongoose";
import type { CategoryDTO, ExpenseDTO, IncomeDTO, MonthlySummaryDTO, PreferencesDTO } from "@/types/dto";
import type { ICategory, IExpense, IIncome, IMonthlySummary, IUserPreferences } from "@/types/models";

const id = (v: Types.ObjectId | string | null | undefined): string | null =>
  v == null ? null : typeof v === "string" ? v : v.toHexString();
const iso = (d: Date | string) => (typeof d === "string" ? d : d.toISOString());

export type CategoryRef = Pick<ICategory, "_id" | "name" | "icon" | "color">;

export function toCategoryDTO(c: ICategory): CategoryDTO {
  return {
    id: id(c._id)!,
    name: c.name,
    kind: c.kind,
    icon: c.icon ?? null,
    color: c.color ?? null,
    defaultTaxSection: c.defaultTaxSection,
    sortOrder: c.sortOrder,
    isSystem: c.isSystem,
    isArchived: c.isArchived,
  };
}

export function toExpenseDTO(e: IExpense, category?: CategoryRef | null): ExpenseDTO {
  return {
    id: id(e._id)!,
    categoryId: id(e.categoryId)!,
    category: category
      ? { id: id(category._id)!, name: category.name, icon: category.icon ?? null, color: category.color ?? null }
      : null,
    amountPaise: e.amountPaise,
    currency: e.currency,
    description: e.description ?? null,
    merchant: e.merchant ?? null,
    date: iso(e.date),
    paymentMethod: e.paymentMethod,
    upiApp: e.upiApp ?? null,
    taxSection: e.taxSection,
    tags: e.tags ?? [],
    notes: e.notes ?? null,
    receiptUrl: e.receiptUrl ?? null,
    recurringRuleId: id(e.recurringRuleId),
    createdAt: iso(e.createdAt),
    updatedAt: iso(e.updatedAt),
  };
}

export function toIncomeDTO(i: IIncome): IncomeDTO {
  return {
    id: id(i._id)!,
    source: i.source,
    amountPaise: i.amountPaise,
    currency: i.currency,
    date: iso(i.date),
    description: i.description ?? null,
    recurringRuleId: id(i.recurringRuleId),
    createdAt: iso(i.createdAt),
  };
}

export function toSummaryDTO(s: IMonthlySummary): MonthlySummaryDTO {
  return {
    year: s.year,
    month: s.month,
    totalExpensePaise: s.totalExpensePaise,
    totalIncomePaise: s.totalIncomePaise,
    savingsPaise: s.savingsPaise,
    savingsRate: s.savingsRate,
    expenseCount: s.expenseCount,
    largestExpensePaise: s.largestExpensePaise,
    averageExpensePaise: s.averageExpensePaise,
    byCategory: s.byCategory.map((c) => ({ categoryId: id(c.categoryId)!, name: c.name, totalPaise: c.totalPaise, count: c.count })),
    byPaymentMethod: s.byPaymentMethod.map((p) => ({ ...p })),
    byTaxSection: s.byTaxSection.map((t) => ({ ...t })),
    dailyTotalsPaise: [...s.dailyTotalsPaise],
    changeFromPreviousMonth: s.changeFromPreviousMonth,
    lastCalculatedAt: iso(s.lastCalculatedAt),
  };
}

export function toPreferencesDTO(p: IUserPreferences): PreferencesDTO {
  return {
    currency: p.currency,
    timezone: p.timezone,
    locale: p.locale,
    fyStart: p.fyStart,
    theme: p.theme,
    defaultPaymentMethod: p.defaultPaymentMethod,
    defaultUpiApp: p.defaultUpiApp,
    budgetAlertsEnabled: p.budgetAlertsEnabled,
  };
}
