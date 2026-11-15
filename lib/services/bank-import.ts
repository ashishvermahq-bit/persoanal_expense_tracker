import "server-only";
import Papa from "papaparse";
import { Types } from "mongoose";
import { fromInputDate } from "@/lib/dates";
import { toPaise } from "@/lib/money";
import type { CreateExpenseInput } from "@/lib/validation/expense";
import type { PaymentMethod, TaxSection } from "@/types/models";
import { assertUsableCategory } from "./categories";
import { createExpense } from "./expenses";

/** Upload guards: Vercel caps request bodies at 4.5 MB anyway; statements are far smaller. */
export const IMPORT_MAX_BYTES = 1024 * 1024;
export const IMPORT_MAX_ROWS = 2000;

interface BankTransaction {
  date: string; // YYYY-MM-DD (IST civil date)
  description: string;
  amount: string; // rupees as text; positive for expenses, negative for credits
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
export function parseCSV(csvContent: string, maxRows = IMPORT_MAX_ROWS): BankTransaction[] {
  // A real CSV parser: bank exports quote descriptions that contain commas.
  const { data } = Papa.parse<string[]>(csvContent.trim(), { skipEmptyLines: true });
  const transactions: BankTransaction[] = [];

  // Skip the header row.
  for (const raw of data.slice(1, maxRows + 1)) {
    const row = raw.map((v) => (v ?? "").trim());
    if (row.length < 3) continue;

    const [dateStr, description, amountStr] = row as [string, string, string];
    const date = parseDate(dateStr);
    if (!date) continue;

    // Keep the typed text (no float round-trip); "1,250.50" → "1250.50".
    const amount = amountStr.replace(/[₹,\s]/g, "");
    if (!/^-?\d+(\.\d{1,2})?$/.test(amount)) continue;

    transactions.push({ date, description, amount, merchant: extractMerchant(description) });
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
  const date = `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
  if (!fromInputDate(date)) return null;

  // Extract amount
  const amountMatch = smsText.match(/(?:by|of|₹)\s*(\d+(?:\.\d{2})?)/i);
  if (!amountMatch) return null;

  const amount = amountMatch[1]!;
  const isDebit = /debit|withdraw/i.test(smsText);

  return {
    date,
    description: smsText.substring(0, 100),
    amount: isDebit ? amount : `-${amount}`,
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
  // Validates ownership once (system or the user's own category) instead of failing every row.
  const category = await assertUsableCategory(userObjectId, categoryId);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [i, tx] of transactions.entries()) {
    try {
      // Credits (negative amounts) aren't expenses; skip rather than fail validation.
      if (tx.amount.startsWith("-") || toPaise(tx.amount) <= 0) {
        skipped++;
        continue;
      }
      const date = fromInputDate(tx.date);
      if (!date) throw new Error(`Invalid date: ${tx.date}`);
      const input: CreateExpenseInput = {
        amountPaise: toPaise(tx.amount),
        categoryId: category.toHexString(),
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
    } catch {
      // Row number only: raw error text can carry database details.
      skipped++;
      errors.push(`Row ${i + 2}: couldn't import`);
    }
  }

  return { imported, skipped, errors };
}

// Helpers
/** DD/MM/YYYY or YYYY-MM-DD → "yyyy-mm-dd", only if it's a real calendar date. */
function parseDate(dateStr: string): string | null {
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(dateStr);
  const iso = dmy ? `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}` : /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : null;
  return iso && fromInputDate(iso) ? iso : null;
}

function extractMerchant(text: string): string {
  // Extract common merchant patterns
  const merchantMatch = text.match(/(?:at|by|from|with|@)\s+([A-Z][^,\.]+)/i);
  return merchantMatch ? merchantMatch[1].trim().substring(0, 50) : "";
}
