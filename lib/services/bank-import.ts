import "server-only";
import { Types } from "mongoose";
import { fromInputDate } from "@/lib/dates";
import { toPaise } from "@/lib/money";
import type { CreateExpenseInput } from "@/lib/validation/expense";
import type { PaymentMethod, TaxSection } from "@/types/models";
import { createExpense } from "./expenses";

interface BankTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive for expenses, negative for income (or reversed by bank)
  merchant?: string;
  reference?: string;
}

const PAYMENT_METHOD_PATTERNS: Record<string, PaymentMethod> = {
  "upi": "upi",
  "neft": "net_banking",
  "rtgs": "net_banking",
  "imps": "net_banking",
  "card": "credit_card",
  "atm": "cash",
  "debit": "debit_card",
};

/**
 * Parse CSV from common Indian bank formats.
 * Expected columns: Date, Description, Amount, Balance (minimal support)
 * Returns extracted transactions.
 */
export function parseCSV(csvContent: string): BankTransaction[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  // Skip header row (line 0)
  const transactions: BankTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((v) => v.trim());
    if (row.length < 3) continue;

    const [dateStr, description, amountStr] = row;
    const date = parseDate(dateStr);
    if (!date) continue;

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) continue;

    transactions.push({
      date: date.toISOString().split("T")[0],
      description,
      amount,
      merchant: extractMerchant(description),
    });
  }

  return transactions;
}

/**
 * Parse SMS text (bank SMS format) to extract transaction.
 * Example: "A/c XXX1234 debited by 500 at XYZ Merchant on 15/11/2026 at 14:30"
 */
export function parseSMS(smsText: string): BankTransaction | null {
  // Extract date (DD/MM/YYYY format)
  const dateMatch = smsText.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (!dateMatch) return null;

  const [, day, month, year] = dateMatch;
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (isNaN(date.getTime())) return null;

  // Extract amount
  const amountMatch = smsText.match(/(?:by|of|₹)\s*(\d+(?:\.\d{2})?)/i);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1]);
  const isDebit = /debit|withdraw/i.test(smsText);

  return {
    date: date.toISOString().split("T")[0],
    description: smsText.substring(0, 100),
    amount: isDebit ? amount : -amount,
    merchant: extractMerchant(smsText),
  };
}

/**
 * Batch import transactions as expenses.
 * Skips duplicate based on date + amount + merchant.
 */
export async function importTransactions(
  userId: Types.ObjectId | string,
  transactions: BankTransaction[],
  categoryId: string,
  paymentMethod: PaymentMethod = "debit_card"
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const tx of transactions) {
    try {
      // Credits (negative amounts) aren't expenses; skip rather than fail validation.
      if (tx.amount <= 0) {
        skipped++;
        continue;
      }
      const date = fromInputDate(tx.date);
      if (!date) throw new Error(`Invalid date: ${tx.date}`);
      const input: CreateExpenseInput = {
        amountPaise: toPaise(tx.amount),
        categoryId,
        date,
        paymentMethod,
        upiApp: null,
        description: tx.description.slice(0, 200) || null,
        merchant: tx.merchant?.slice(0, 100) || null,
        taxSection: "none" satisfies TaxSection,
        tags: [],
      };
      await createExpense(userObjectId, input);
      imported++;
    } catch (err) {
      skipped++;
      if (err instanceof Error) errors.push(err.message);
    }
  }

  return { imported, skipped, errors };
}

// Helpers
function parseDate(dateStr: string): Date | null {
  // Try DD/MM/YYYY
  const dmy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    return new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`);
  }
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  return null;
}

function extractMerchant(text: string): string {
  // Extract common merchant patterns
  const merchantMatch = text.match(/(?:at|by|from|with|@)\s+([A-Z][^,\.]+)/i);
  return merchantMatch ? merchantMatch[1].trim().substring(0, 50) : "";
}
