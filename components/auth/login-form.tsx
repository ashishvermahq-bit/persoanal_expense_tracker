"use client";

import Link from "next/link";
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
import { safeNext } from "@/lib/safe-next";
import { FormError } from "./form-error";
import { authLinkClassName } from "./link-style";
import { useDesktopAutofocus } from "./use-desktop-autofocus";

export function LoginForm() {
  const params = useSearchParams();
  const nextPath = params.get("next") ?? undefined;
  const notice = params.has("reset")
    ? "Password changed. Sign in with your new password."
    : params.has("reauth")
      ? "Your session ended (your password was changed or you signed out elsewhere). Please sign in again."
      : null;
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
      {notice && !formError && (
        <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success-ink">
          {notice}
        </p>
      )}
      <Input ref={emailRef} label="Email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" error={errors.email} />
      <PasswordInput
        label="Password"
        name="password"
        autoComplete="current-password"
        required
        placeholder="••••••••"
        error={errors.password}
        labelAside={
          <Link href="/forgot-password" className={`${authLinkClassName} text-xs`}>
            Forgot password?
          </Link>
        }
      />
      {formError && <FormError message={formError} />}
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Sign in
      </Button>
    </Form>
  );
}
