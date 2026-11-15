"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Try again.");
      setLoading(false);
    }
  }

  return (
    // Icon-only on phones (the header is tight); the label is still announced.
    <Button variant="secondary" size="sm" onClick={logout} loading={loading} aria-label="Sign out" title="Sign out" data-testid="logout" className="px-2.5 sm:px-3">
      {!loading && <LogOut className="size-3.5" aria-hidden />}
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
