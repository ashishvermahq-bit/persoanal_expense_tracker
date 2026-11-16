import "server-only";
import { Types } from "mongoose";
import { csvRow, escapeHtml } from "@/lib/csv";
import { currentYearMonthIST, formatDateIN, fyRange, monthRange } from "@/lib/dates";
import { formatRupeesPlain } from "@/lib/money";
import { Category } from "@/models/category";
import { Expense } from "@/models/expense";
import { Income } from "@/models/income";

export interface ExportOptions {
  month?: number;
  year?: number;
  fy?: number; // financial year start year (e.g., 2025 for FY 2025-26)
  includeTaxSummary?: boolean;
}

interface Section {
  heading: string;
  columns: string[];
  rows: unknown[][];
}

interface Report {
  title: string;
  sections: Section[];
}

const EXPENSE_COLUMNS = ["Date", "Category", "Amount (₹)", "Payment Method", "Description", "Merchant", "Tags", "Notes"];
const INCOME_COLUMNS = ["Date", "Source", "Amount (₹)", "Description"];
const SECTION_80C_CAP_PAISE = 1_50_000_00;

function toObjectId(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === "string" ? new Types.ObjectId(id) : id;
}

function periodOf(options: ExportOptions): { start: Date; end: Date; title: string } {
  if (options.fy) {
    const { start, end } = fyRange(options.fy);
    return { start, end, title: `FY ${options.fy}-${String((options.fy + 1) % 100).padStart(2, "0")} Export` };
  }
  const { year, month } = options.month && options.year ? { year: options.year, month: options.month } : currentYearMonthIST();
  const { start, end } = monthRange(year, month);
  return { start, end, title: `${year}-${String(month).padStart(2, "0")} Export` };
}

/**
 * One report model, rendered as CSV or HTML. Every query is scoped by userId and
 * excludes soft-deleted rows; amounts stay integer paise until formatted.
 */
async function buildReport(userId: Types.ObjectId | string, options: ExportOptions): Promise<Report> {
  const uid = toObjectId(userId);
  const { start, end, title } = periodOf(options);
  const range = { $gte: start, $lt: end };

  const [expenses, income] = await Promise.all([
    Expense.find({ userId: uid, date: range, deletedAt: null }).sort({ date: -1 }).lean(),
    Income.find({ userId: uid, date: range, deletedAt: null }).sort({ date: -1 }).lean(),
  ]);
  const categoryIds = [...new Set(expenses.map((e) => e.categoryId.toHexString()))].map((h) => new Types.ObjectId(h));
  const categories = await Category.find({ _id: { $in: categoryIds } }, { name: 1 }).lean();
  const names = new Map(categories.map((c) => [c._id.toHexString(), c.name]));

  const sections: Section[] = [
    {
      heading: "Expenses",
      columns: EXPENSE_COLUMNS,
      rows: expenses.map((e) => [
        formatDateIN(e.date),
        names.get(e.categoryId.toHexString()) ?? "Unknown",
        formatRupeesPlain(e.amountPaise),
        e.paymentMethod,
        e.description ?? "",
        e.merchant ?? "",
        (e.tags ?? []).join("; "),
        e.notes ?? "",
      ]),
    },
    {
      heading: "Income",
      columns: INCOME_COLUMNS,
      rows: income.map((i) => [formatDateIN(i.date), i.source, formatRupeesPlain(i.amountPaise), i.description ?? ""]),
    },
  ];

  // The FY range above already bounds the rows (IST), so no per-row date maths here.
  if (options.includeTaxSummary && options.fy) {
    const sum = (section: string) => expenses.filter((e) => e.taxSection === section).reduce((s, e) => s + e.amountPaise, 0);
    sections.push({
      heading: "Tax summary (informational, not tax advice)",
      columns: ["Section", "Total Amount (₹)"],
      rows: [
        ["80C (cap ₹1,50,000)", formatRupeesPlain(Math.min(sum("80C"), SECTION_80C_CAP_PAISE))],
        ["80D", formatRupeesPlain(sum("80D"))],
        ["HRA (if claiming)", formatRupeesPlain(sum("HRA"))],
      ],
    });
  }

  return { title, sections };
}

export function reportToCSV(report: Report): string {
  const lines = [csvRow([report.title]), ""];
  for (const s of report.sections) {
    lines.push(csvRow([s.heading.toUpperCase()]), csvRow(s.columns), ...s.rows.map(csvRow), "");
  }
  return lines.join("\r\n");
}

/** Printable HTML (save as PDF from the browser). All user text is escaped. */
export function reportToHTML(report: Report): string {
  const table = (s: Section) => `
  <h2>${escapeHtml(s.heading)}</h2>
  <table>
    <thead><tr>${s.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
    <tbody>${s.rows.length ? s.rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${s.columns.length}">None</td></tr>`}</tbody>
  </table>`;
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 20px; }
    h1 { font-size: 20px; } h2 { font-size: 14px; margin-top: 20px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.title)}</h1>${report.sections.map(table).join("")}
</body>
</html>
`;
}

export async function exportToCSV(userId: Types.ObjectId | string, options: ExportOptions): Promise<string> {
  return reportToCSV(await buildReport(userId, options));
}

export async function exportToPDFHTML(userId: Types.ObjectId | string, options: ExportOptions): Promise<string> {
  return reportToHTML(await buildReport(userId, options));
}
