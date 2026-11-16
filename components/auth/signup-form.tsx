"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiClientError, api } from "@/lib/client";
import { signupSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/fields";
import { markWelcome } from "@/components/dashboard/welcome-count-up";
import { FormError } from "./form-error";
import { useDesktopAutofocus } from "./use-desktop-autofocus";

export function SignupForm() {
  const nameRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  // One "Show password" toggle reveals both fields, so you can check they match.
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  useDesktopAutofocus(nameRef);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      // No toast: the full navigation below would wipe it; the dashboard greets by name.
      await api("/api/auth/signup", { method: "POST", json: parsed.data });
      markWelcome(); // the dashboard counts its hero figure up once
      // Full navigation, not router.replace + refresh: the refresh re-requests the
      // current route and can abort the pending navigation (stuck on this page).
      // The session cookie just changed, so every cached server render is stale anyway.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard navigation on auth change: drops the previous session's client router cache / preserved route state
      window.location.assign("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        setFormError(Object.keys(err.fields).length ? null : err.message);
      } else {
        setFormError("Network error. Check your connection and try again.");
      }
      setLoading(false);
    }
  }

  return (
    <Form onSubmit={onSubmit} noValidate className="space-y-4" data-testid="signup-form">
      <Input ref={nameRef} label="Full name" name="name" autoComplete="name" required placeholder="Priya Sharma" error={errors.name} />
      <Input label="Email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" error={errors.email} />
      <PasswordInput
        label="Password"
        name="password"
        autoComplete="new-password"
        required
        placeholder="••••••••"
        error={errors.password}
        visible={showPasswords}
        onVisibleChange={setShowPasswords}
        showRequirements
      />
      <PasswordInput
        label="Confirm password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        placeholder="••••••••"
        error={errors.confirmPassword}
        visible={showPasswords}
        toggle={false}
      />
      {formError && <FormError message={formError} />}
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Create account
      </Button>
    </Form>
  );
}
