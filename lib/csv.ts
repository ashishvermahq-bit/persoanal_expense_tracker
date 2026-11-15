/**
 * CSV cells that are safe to open in Excel / Google Sheets / LibreOffice.
 *
 * - Every cell is quoted and inner quotes doubled (RFC 4180), so commas,
 *   quotes and newlines in a description can't shift columns.
 * - Formula injection: a cell starting with = + - @ (or tab / CR, which some
 *   apps strip first) is run as a formula when opened, e.g. a merchant named
 *   `=HYPERLINK("http://evil","Click")`. Those get a leading apostrophe, which
 *   spreadsheets show as plain text. Numbers we format ourselves never start
 *   with one of these, since amounts are positive.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
