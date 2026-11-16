import { z } from "zod";
import { parseWith, withAuth } from "@/lib/api";
import { toInputDate } from "@/lib/dates";
import { searchParamsToObject } from "@/lib/query";
import { exportAccountCSV, exportAccountJSON } from "@/lib/services/account";

const query = z.object({ format: z.enum(["json", "csv"]).default("json") });

/** Download everything: `?format=json` (complete) or `?format=csv` (all entries, spreadsheet-safe). */
export const GET = withAuth(async (request, _ctx, { userId }) => {
  const { format } = parseWith(query, searchParamsToObject(new URL(request.url).searchParams));
  const stamp = toInputDate(new Date());
  if (format === "csv") {
    return new Response("\uFEFF" + (await exportAccountCSV(userId)), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="paisa-data-${stamp}.csv"` },
    });
  }
  return new Response(JSON.stringify(await exportAccountJSON(userId), null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="paisa-data-${stamp}.json"` },
  });
});
