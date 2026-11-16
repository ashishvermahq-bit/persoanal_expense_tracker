import { connection } from "next/server";
import { ApiError, fail, ok, withApi } from "@/lib/api";
import { cronAuthorized } from "@/lib/auth/cron";
import { connectDB } from "@/lib/db";
import { redactForLog } from "@/lib/log";
import { generateRecurringEntries, usersWithDueRules } from "@/lib/services/recurring";
import { pruneOrphanReceipts } from "@/lib/storage";

/**
 * Generates due recurring entries, then prunes orphan receipts. Called with
 * `Authorization: Bearer $CRON_SECRET` by the `jobs` service in deploy/compose.yaml.
 */
export const GET = withApi(async (request) => {
  // Without this, cacheComponents prerenders the handler at build time, where
  // CRON_SECRET is unset, and serves that "Not found" forever.
  await connection();
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
  // Same job: drop receipts no expense uses.
  let prunedReceipts = 0;
  try {
    prunedReceipts = await pruneOrphanReceipts(now);
  } catch (err) {
    console.error("[cron/recurring] receipt cleanup failed", redactForLog(err));
  }
  return ok({ users: users.length, generated, failedUsers, prunedReceipts });
});
