import { z } from "zod";
import { parseWith, withAuth } from "@/lib/api";
import { searchParamsToObject } from "@/lib/query";
import { exportToCSV, exportToPDFHTML } from "@/lib/services/export";

const exportQuery = z
  .object({
    format: z.enum(["csv", "pdf"]).default("csv"),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    fy: z.coerce.number().int().min(2000).max(2100).optional(),
    includeTaxSummary: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  })
  .refine((q) => (q.month === undefined) === (q.year === undefined), { path: ["month"], message: "Give both month and year" });

export const GET = withAuth(async (request, _ctx, { userId }) => {
  const { format, ...options } = parseWith(exportQuery, searchParamsToObject(new URL(request.url).searchParams));

  if (format === "pdf") {
    return new Response(await exportToPDFHTML(userId, options), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="paisa-export.html"`,
      },
    });
  }
  // BOM so Excel reads ₹ and Indian names as UTF-8.
  return new Response("﻿" + (await exportToCSV(userId, options)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paisa-export.csv"`,
    },
  });
});
