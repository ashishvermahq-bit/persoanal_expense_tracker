"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, api } from "@/lib/client";
import { loginSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/fields";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { user } = await api<{ user: { name: string } }>("/api/auth/login", { method: "POST", json: parsed.data });
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      router.replace(safeNext(nextPath));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError("Network error. Check your connection and try again.");
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" data-testid="login-form">
      <Input label="Email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" error={errors.email} />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="••••••••"
        error={errors.password}
        labelAside={
          <Link href="#" className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            Forgot password?
          </Link>
        }
      />
      {formError && (
        <p role="alert" data-testid="form-error" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </p>
      )}
      <Button type="submit" loading={loading} className="mt-1 w-full">
        Sign in
      </Button>
    </form>
  );
}

/** Only allow same-origin relative redirects. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}
