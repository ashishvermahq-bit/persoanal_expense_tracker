import type { Types } from "mongoose";

export const DATE_RANGES = ["last30days", "thisMonth", "last3months", "thisYear"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export const DASHBOARD_VIEWS = ["list", "chart", "calendar"] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

export const PAYMENT_METHODS = [
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "digital_wallet",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

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
}

export interface IUserPreferences extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  currency: string;
  timezone: string;
  defaultDateRange: DateRange;
  defaultView: DashboardView;
}

export interface ICategory extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId | null;
  name: string;
  icon?: string;
  color?: string;
  isSystem: boolean;
  isArchived: boolean;
}

export interface IExpense extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  amount: number;
  currency: string;
  description?: string;
  date: Date;
  paymentMethod: PaymentMethod;
  tags: string[];
  notes?: string;
  receiptUrl?: string;
  deletedAt: Date | null;
}

export interface ICategoryBreakdown {
  categoryId: Types.ObjectId;
  name: string;
  total: number;
  count: number;
}

export interface IMonthlySummary extends Timestamps {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  year: number;
  month: number;
  totalAmount: number;
  expenseCount: number;
  largestExpense: number;
  averageExpense: number;
  byCategory: ICategoryBreakdown[];
  changeFromPreviousMonth: number | null;
  lastCalculatedAt: Date;
}
