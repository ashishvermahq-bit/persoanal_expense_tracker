"use client";

import { useRef, useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiClientError, api } from "@/lib/client";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/fields";
import { FormError } from "./form-error";
import { useDesktopAutofocus } from "./use-desktop-autofocus";

/** Same confirmation whether or not the email has an account. */
export function ForgotForm() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  useDesktopAutofocus(emailRef);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api("/api/auth/forgot", { method: "POST", json: parsed.data });
      setSent(true);
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p role="status" data-testid="forgot-sent" className="flex items-start gap-2 text-sm text-ink-2">
        <MailCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        If an account exists for that email, a link to reset your password is on its way. It works once, for 30 minutes.
      </p>
    );
  }

  return (
    <Form onSubmit={onSubmit} noValidate className="space-y-4" data-testid="forgot-form">
      <Input ref={emailRef} label="Email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" error={errors.email} />
      {formError && <FormError message={formError} />}
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Send reset link
      </Button>
    </Form>
  );
}
