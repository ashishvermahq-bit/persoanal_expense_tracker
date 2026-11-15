"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiClientError, api } from "@/lib/client";
import { loginSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/fields";
import { markWelcome } from "@/components/dashboard/welcome-count-up";
import { FormError } from "./form-error";
import { useDesktopAutofocus } from "./use-desktop-autofocus";

export function LoginForm() {
  const nextPath = useSearchParams().get("next") ?? undefined;
  const emailRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  useDesktopAutofocus(emailRef);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    // Fields are uncontrolled: typed values survive any error below.
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      // No toast: the full navigation below would wipe it; the dashboard greets by name.
      await api("/api/auth/login", { method: "POST", json: parsed.data });
      markWelcome(); // the dashboard counts its hero figure up once
      // Full navigation, not router.replace + refresh: the refresh re-requests the
      // current route and can abort the pending navigation (stuck on this page).
      // The session cookie just changed, so every cached server render is stale anyway.
      window.location.assign(safeNext(nextPath));
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
    <Form onSubmit={onSubmit} noValidate className="space-y-4" data-testid="login-form">
      <Input ref={emailRef} label="Email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" error={errors.email} />
      <PasswordInput label="Password" name="password" autoComplete="current-password" required placeholder="••••••••" error={errors.password} />
      {formError && <FormError message={formError} />}
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Sign in
      </Button>
    </Form>
  );
}

/** Only allow same-origin relative redirects. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}
