"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiClientError, api } from "@/lib/client";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/fields";
import { FormError } from "./form-error";

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const parsed = resetPasswordSchema.safeParse({ ...Object.fromEntries(new FormData(e.currentTarget)), token });
    if (!parsed.success) {
      const f = fieldErrors(parsed.error);
      setErrors(f);
      if (f.token) setFormError("This reset link isn't valid. Ask for a new one.");
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api("/api/auth/reset", { method: "POST", json: parsed.data });
      // Every session was signed out; sign in again with the new password.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard navigation on auth change: drops the previous session's client router cache / preserved route state
      window.location.assign("/login?reset=1");
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
    <Form onSubmit={onSubmit} noValidate className="space-y-4" data-testid="reset-form">
      <PasswordInput label="New password" name="password" autoComplete="new-password" required showRequirements visible={visible} onVisibleChange={setVisible} error={errors.password} />
      <PasswordInput label="Confirm new password" name="confirmPassword" autoComplete="new-password" required toggle={false} visible={visible} error={errors.confirmPassword} />
      {formError && <FormError message={formError} />}
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Set new password
      </Button>
    </Form>
  );
}
