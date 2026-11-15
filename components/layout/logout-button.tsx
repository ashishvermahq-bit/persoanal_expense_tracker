import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A native form post, no JavaScript: works before hydration, and the server's
 * 303 to /login is a full navigation that discards the signed-out user's
 * client-side state. See app/api/auth/logout/route.ts.
 */
export function LogoutButton() {
  return (
    <form method="post" action="/api/auth/logout">
      {/* Icon-only on phones (the header is tight); the label is still announced. */}
      <Button type="submit" variant="secondary" size="sm" aria-label="Sign out" title="Sign out" data-testid="logout" className="px-2.5 sm:px-3">
        <LogOut className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </form>
  );
}
