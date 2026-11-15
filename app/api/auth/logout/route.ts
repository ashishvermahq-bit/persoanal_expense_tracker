import { ok, withApi } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth/cookies";

export const POST = withApi(async () => {
  await clearSessionCookie();
  return ok({ loggedOut: true });
});
