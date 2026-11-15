/**
 * Plain JSON shapes sent to the client (ids as hex strings, dates as ISO
 * strings, money as integer paise). Services convert Mongoose docs to these.
 */
import type {
  CategoryKind,
  IncomeSource,
  PaymentMethod as PaymentMethodType,
  TaxSection,
  UpiApp,
} from "./models";

export type PaymentMethod = PaymentMethodType;

export interface CategoryDTO {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
  defaultTaxSection: TaxSection;
  sortOrder: number;
  isSystem: boolean;
  isArchived: boolean;
}

export interface ExpenseDTO {
  id: string;
  categoryId: string;
  category: Pick<CategoryDTO, "id" | "name" | "icon" | "color"> | null;
  amountPaise: number;
  currency: string;
  description: string | null;
  merchant: string | null;
  /** ISO instant */
  date: string;
  paymentMethod: PaymentMethod;
  upiApp: UpiApp | null;
  taxSection: TaxSection;
  tags: string[];
  notes: string | null;
  receiptUrl: string | null;
  recurringRuleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeDTO {
  id: string;
  source: IncomeSource;
  amountPaise: number;
  currency: string;
  date: string;
  description: string | null;
  recurringRuleId: string | null;
  createdAt: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Sum of amountPaise across ALL matches (not just this page). */
  totalPaise: number;
}

export interface MonthlySummaryDTO {
  year: number;
  month: number;
  totalExpensePaise: number;
  totalIncomePaise: number;
  savingsPaise: number;
  savingsRate: number | null;
  expenseCount: number;
  largestExpensePaise: number;
  averageExpensePaise: number;
  byCategory: { categoryId: string; name: string; totalPaise: number; count: number }[];
  byPaymentMethod: { paymentMethod: PaymentMethod; totalPaise: number; count: number }[];
  byTaxSection: { taxSection: TaxSection; totalPaise: number; count: number }[];
  dailyTotalsPaise: number[];
  changeFromPreviousMonth: number | null;
  lastCalculatedAt: string;
}

export interface BudgetDTO {
  id: string;
  categoryId: string;
  amountPaise: number;
  year: number | null;
  month: number | null;
}

export interface BudgetWarning {
  status: "warning" | "over";
  categoryId: string;
  categoryName: string;
  budgetPaise: number;
  spendPaise: number;
  message: string;
}

export interface PreferencesDTO {
  currency: string;
  timezone: string;
  locale: "en-IN" | "hi-IN";
  fyStart: "april" | "january";
  theme: "system" | "light" | "dark";
  defaultPaymentMethod: PaymentMethod;
  defaultUpiApp: UpiApp | null;
  budgetAlertsEnabled: boolean;
}
