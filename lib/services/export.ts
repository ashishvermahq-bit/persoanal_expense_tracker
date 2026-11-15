import "server-only";
import { Types } from "mongoose";
import { Expense } from "@/models/expense";
import { Income } from "@/models/income";
import { Category } from "@/models/category";
import { formatRupeesPlain } from "@/lib/money";
import { formatDateIN, monthRange, fyRange, currentYearMonthIST } from "@/lib/dates";

interface ExportOptions {
  month?: number;
  year?: number;
  fy?: number; // financial year start year (e.g., 2025 for FY 2025-26)
  includeTaxSummary?: boolean;
}

/**
 * Generate CSV export for expenses and income.
 */
export async function exportToCSV(userId: Types.ObjectId | string, options: ExportOptions): Promise<string> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const now = currentYearMonthIST();

  let startDate: Date;
  let endDate: Date;
  let title: string;

  if (options.fy) {
    // Financial year: Apr start_year to Mar (start_year + 1)
    const range = fyRange(options.fy);
    startDate = range.start;
    endDate = range.end;
    title = `FY ${options.fy}-${options.fy + 1} Export`;
  } else if (options.month && options.year) {
    const range = monthRange(options.year, options.month);
    startDate = range.start;
    endDate = range.end;
    title = `${options.year}-${String(options.month).padStart(2, "0")} Export`;
  } else {
    const range = monthRange(now.year, now.month);
    startDate = range.start;
    endDate = range.end;
    title = `${now.year}-${String(now.month).padStart(2, "0")} Export`;
  }

  // Fetch expenses
  const expenses = await Expense.find({
    userId: userObjectId,
    date: { $gte: startDate, $lt: endDate },
    deletedAt: null,
  })
    .sort({ date: -1 })
    .lean();

  // Fetch categories
  const categoryIds = [...new Set(expenses.map((e) => e.categoryId))];
  const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
  const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

  // Fetch income
  const income = await Income.find({
    userId: userObjectId,
    date: { $gte: startDate, $lt: endDate },
    deletedAt: null,
  })
    .sort({ date: -1 })
    .lean();

  // Build CSV
  let csv = `${title}\n\n`;
  csv += "EXPENSES\n";
  csv += "Date,Category,Amount (₹),Payment Method,Description,Merchant,Tags,Notes\n";

  for (const exp of expenses) {
    const categoryName = categoryMap.get(exp.categoryId.toString()) || "Unknown";
    const amount = formatRupeesPlain(exp.amountPaise);
    const tags = (exp.tags || []).join("; ");
    csv += [
      formatDateIN(exp.date),
      `"${categoryName}"`,
      amount,
      exp.paymentMethod,
      `"${exp.description || ""}"`,
      `"${exp.merchant || ""}"`,
      `"${tags}"`,
      `"${exp.notes || ""}"`,
    ].join(",");
    csv += "\n";
  }

  csv += `\nINCOME\n`;
  csv += "Date,Source,Amount (₹),Description\n";

  for (const inc of income) {
    const amount = formatRupeesPlain(inc.amountPaise);
    csv += [
      formatDateIN(inc.date),
      inc.source,
      amount,
      `"${inc.description || ""}"`,
    ].join(",");
    csv += "\n";
  }

  // Tax summary
  if (options.includeTaxSummary && options.fy) {
    csv += "\nTAX SUMMARY (Informational - Not Tax Advice)\n";
    csv += "Section,Total Amount (₹)\n";

    const fyExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
      return fy === options.fy;
    });

    const by80C = fyExpenses
      .filter((e) => e.taxSection === "80C")
      .reduce((sum, e) => sum + e.amountPaise, 0);
    const by80D = fyExpenses
      .filter((e) => e.taxSection === "80D")
      .reduce((sum, e) => sum + e.amountPaise, 0);
    const byHRA = fyExpenses
      .filter((e) => e.taxSection === "HRA")
      .reduce((sum, e) => sum + e.amountPaise, 0);

    csv += `"80C (cap ₹1,50,000)",${formatRupeesPlain(Math.min(by80C, 15000000))}\n`;
    csv += `"80D",${formatRupeesPlain(by80D)}\n`;
    csv += `"HRA (if claiming)",${formatRupeesPlain(byHRA)}\n`;
  }

  return csv;
}

/**
 * Generate PDF export (returns HTML that can be printed to PDF).
 * Uses basic HTML table format suitable for browser print.
 */
export async function exportToPDFHTML(userId: Types.ObjectId | string, options: ExportOptions): Promise<string> {
  const csv = await exportToCSV(userId, options);
  const lines = csv.split("\n");

  // Simple HTML table from CSV
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { font-size: 20px; margin-bottom: 10px; }
    h2 { font-size: 14px; margin-top: 20px; margin-bottom: 10px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .amount { text-align: right; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${lines[0]}</h1>
  ${lines
    .slice(1)
    .join("\n")
    .replace(/\n\n/g, "</table><h2>")
    .replace(/([A-Z][A-Z\s]*)\n/g, "<h2>$1</h2><table><tr><th>")
    .replace(/\n/g, "</tr><tr><td>")
    .replace(/,/g, "</td><td>")
    .replace(/<\/tr><\/tr>/g, "</tr>")}
</table>
</body>
</html>
`;

  return html;
}
