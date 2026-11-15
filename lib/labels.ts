/**
 * Human labels for enum values. Single place so the UI, CSV export and PDF
 * agree. (i18n: the hi-IN table lands alongside these in Phase 2.)
 */
import type { IncomeSource, PaymentMethod, TaxSection, UpiApp } from "@/types/models";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: "UPI",
  debit_card: "Debit card",
  credit_card: "Credit card",
  cash: "Cash",
  net_banking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  other: "Other",
};

export const UPI_APP_LABELS: Record<UpiApp, string> = {
  gpay: "GPay",
  phonepe: "PhonePe",
  paytm: "Paytm",
  bhim: "BHIM",
  other: "Other UPI",
};

export const TAX_SECTION_LABELS: Record<TaxSection, string> = {
  none: "No tax tag",
  "80C": "80C · investments, LIC, PPF, tuition",
  "80D": "80D · health insurance",
  HRA: "HRA · house rent",
};

export const TAX_SECTION_SHORT: Record<TaxSection, string> = {
  none: "—",
  "80C": "80C",
  "80D": "80D",
  HRA: "HRA",
};

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  salary: "Salary",
  freelance: "Freelance",
  business: "Business",
  interest: "Interest",
  dividend: "Dividend",
  rental: "Rent received",
  gift: "Gift",
  refund: "Refund / cashback",
  other: "Other",
};
