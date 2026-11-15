import { ok, parseBody, withAuth } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { deleteAccount } from "@/lib/services/account";
import { deleteAccountSchema } from "@/lib/validation/auth";

/** DELETE: erase the account and all its data (password + typed "DELETE" required). */
export const DELETE = withAuth(async (request, _ctx, { userId }) => {
  const input = await parseBody(request, deleteAccountSchema);
  await deleteAccount(userId, input.password);
  await clearSessionCookie();
  return ok({ deleted: true }, { headers: { "Clear-Site-Data": '"cache"' } });
});
