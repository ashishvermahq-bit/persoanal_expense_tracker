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
    <Button variant="secondary" size="sm" onClick={logout} loading={loading} data-testid="logout">
      <LogOut className="size-3.5" aria-hidden />
      Sign out
    </Button>
  );
}
