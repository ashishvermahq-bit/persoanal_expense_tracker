import { withAuth } from "@/lib/api";
import { exportToCSV, exportToPDFHTML } from "@/lib/services/export";
import { searchParamsToObject } from "@/lib/query";

export const GET = withAuth(async (request, _ctx, { userId }) => {
  const url = new URL(request.url);
  const params = searchParamsToObject(url.searchParams);

  const format = (params.format as string) || "csv"; // csv or pdf
  const month = params.month ? parseInt(params.month as string) : undefined;
  const year = params.year ? parseInt(params.year as string) : undefined;
  const fy = params.fy ? parseInt(params.fy as string) : undefined;
  const includeTaxSummary = params.includeTaxSummary === "true";

  try {
    if (format === "pdf") {
      const html = await exportToPDFHTML(userId, { month, year, fy, includeTaxSummary });
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="export.html"`,
        },
      });
    } else {
      const csv = await exportToCSV(userId, { month, year, fy, includeTaxSummary });
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="export.csv"`,
        },
      });
    }
  } catch {
    return new Response("Export failed", { status: 500 });
  }
});
