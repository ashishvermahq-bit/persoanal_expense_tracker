import { ApiError, fail, ok, withApi } from "@/lib/api";
import { cronAuthorized } from "@/lib/auth/cron";
import { connectDB } from "@/lib/db";
import { redactForLog } from "@/lib/log";
import { generateRecurringEntries, usersWithDueRules } from "@/lib/services/recurring";

/** Vercel Cron calls this daily (vercel.json) with `Authorization: Bearer $CRON_SECRET`. */
export const maxDuration = 60;

export const GET = withApi(async (request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail(new ApiError("NOT_FOUND", "Not found"));
  if (!cronAuthorized(request.headers.get("authorization"), secret)) {
    return fail(new ApiError("UNAUTHORIZED", "Unauthorized"));
  }

  await connectDB();
  const now = new Date();
  const users = await usersWithDueRules(now);
  let generated = 0;
  let failedUsers = 0;
  for (const userId of users) {
    try {
      generated += await generateRecurringEntries(userId, now);
    } catch (err) {
      failedUsers++;
      console.error("[cron/recurring] user run failed", redactForLog(err));
    }
  }
  return ok({ users: users.length, generated, failedUsers });
});
