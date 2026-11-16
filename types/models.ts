import type { Types } from "mongoose";

// ---------------------------------------------------------------------------
// Enumerations (single source of truth for Zod schemas, Mongoose enums and UI)
// ---------------------------------------------------------------------------

export const DATE_RANGES = ["last30days", "thisMonth", "last3months", "thisYear", "thisFY"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export const DASHBOARD_VIEWS = ["list", "chart", "calendar"] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

/** Payment modes common in India. `other` kept for imports/legacy rows. */
export const PAYMENT_METHODS = [
  "upi",
  "debit_card",
  "credit_card",
  "cash",
  "net_banking",
  "wallet",
  "emi",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const UPI_APPS = ["gpay", "phonepe", "paytm", "bhim", "other"] as const;
export type UpiApp = (typeof UPI_APPS)[number];

/** Income-tax sections an expense can be tagged with. Informational only. */
export const TAX_SECTIONS = ["none", "80C", "80D", "HRA"] as const;
export type TaxSection = (typeof TAX_SECTIONS)[number];

export const INCOME_SOURCES = [
  "salary",
  "freelance",
  "business",
  "interest",
  "dividend",
  "rental",
  "gift",
  "refund",
  "other",
] as const;
export type IncomeSource = (typeof INCOME_SOURCES)[number];

export const RECURRENCE_FREQUENCIES = ["weekly", "monthly", "quarterly", "yearly"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const FY_STARTS = ["april", "january"] as const;
export type FyStart = (typeof FY_STARTS)[number];

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const LOCALES = ["en-IN", "hi-IN"] as const;
export type Locale = (typeof LOCALES)[number];

export const CATEGORY_KINDS = ["expense", "income"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const ENTRY_KINDS = ["expense", "income"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

// ---------------------------------------------------------------------------
// Documents. All monetary values are integer paise (₹1 = 100 paise).
// ---------------------------------------------------------------------------

interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends Timestamps {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  failedLoginCount: number;
  lockedUntil: Date | null;
  onboardedAt: Date | null;
  sessionVersion: number;
}

export interface IUserPreferences extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  currency: string;
  timezone: string;
  locale: Locale;
  fyStart: FyStart;
  theme: Theme;
  defaultPaymentMethod: PaymentMethod;
  defaultUpiApp: UpiApp | null;
  budgetAlertsEnabled: boolean;
  defaultDateRange: DateRange;
  defaultView: DashboardView;
}

export interface ICategory extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId | null;
  name: string;
  kind: CategoryKind;
  icon?: string;
  color?: string;
  /** Pre-selected tax section when this category is chosen (e.g. Insurance → 80D). */
  defaultTaxSection: TaxSection;
  sortOrder: number;
  isSystem: boolean;
  isArchived: boolean;
}

export interface IExpense extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  amountPaise: number;
  currency: string;
  description?: string;
  merchant?: string;
  date: Date;
  paymentMethod: PaymentMethod;
  upiApp: UpiApp | null;
  taxSection: TaxSection;
  tags: string[];
  notes?: string;
  receiptUrl?: string;
  recurringRuleId: Types.ObjectId | null;
  splitGroupId: Types.ObjectId | null;
  deletedAt: Date | null;
}

export interface IIncome extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  source: IncomeSource;
  amountPaise: number;
  currency: string;
  date: Date;
  description?: string;
  recurringRuleId: Types.ObjectId | null;
  deletedAt: Date | null;
}

export interface IBudget extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  amountPaise: number;
  /** Specific month, or null for the default that applies every month. */
  year: number | null;
  month: number | null;
}

export interface IRecurringRule extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  kind: EntryKind;
  title: string;
  amountPaise: number;
  categoryId: Types.ObjectId | null;
  incomeSource: IncomeSource | null;
  paymentMethod: PaymentMethod;
  upiApp: UpiApp | null;
  taxSection: TaxSection;
  frequency: RecurrenceFrequency;
  /** 1–31; clamped to the month's last day when generating. */
  dayOfMonth: number;
  startsAt: Date;
  endsAt: Date | null;
  nextRunAt: Date;
  lastGeneratedAt: Date | null;
  remindDaysBefore: number;
  isActive: boolean;
}

export interface ISplitParticipant {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  /** Set when the participant is the owning user. */
  isOwner: boolean;
}

export interface ISplitGroup extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  participants: ISplitParticipant[];
  isArchived: boolean;
}

export interface ISplitShare {
  participantId: Types.ObjectId;
  amountPaise: number;
}

export interface ISplitEntry extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  groupId: Types.ObjectId;
  expenseId: Types.ObjectId | null;
  description: string;
  amountPaise: number;
  paidBy: Types.ObjectId;
  shares: ISplitShare[];
  date: Date;
  isSettlement: boolean;
}

// ---------------------------------------------------------------------------
// Monthly summary (cached aggregation)
// ---------------------------------------------------------------------------

export interface ICategoryBreakdown {
  categoryId: Types.ObjectId;
  name: string;
  totalPaise: number;
  count: number;
}

export interface IPaymentMethodBreakdown {
  paymentMethod: PaymentMethod;
  totalPaise: number;
  count: number;
}

export interface ITaxSectionBreakdown {
  taxSection: TaxSection;
  totalPaise: number;
  count: number;
}

export interface IMonthlySummary extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  year: number;
  month: number;
  totalExpensePaise: number;
  totalIncomePaise: number;
  savingsPaise: number;
  /** savings / income, 0–1; null when there is no income. */
  savingsRate: number | null;
  expenseCount: number;
  largestExpensePaise: number;
  averageExpensePaise: number;
  byCategory: ICategoryBreakdown[];
  byPaymentMethod: IPaymentMethodBreakdown[];
  byTaxSection: ITaxSectionBreakdown[];
  /** Index 0 = day 1. Length 31; trailing entries are 0 for shorter months. */
  dailyTotalsPaise: number[];
  changeFromPreviousMonth: number | null;
  lastCalculatedAt: Date;
}
