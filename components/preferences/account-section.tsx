"use client";

import { useState, type FormEvent } from "react";
import { Download, KeyRound, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/form-error";
import { Button, buttonClassName } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, SectionLabel } from "@/components/ui/page-header";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiClientError, api } from "@/lib/client";
import { changePasswordSchema, deleteAccountSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/fields";

/** Preferences → Security & your data: change password, download everything, delete the account. */
export function AccountSection() {
  return (
    <>
      <Card className="space-y-4 p-4 sm:p-6" data-testid="change-password">
        <SectionLabel icon={KeyRound} hue={7}>
          Password
        </SectionLabel>
        <ChangePasswordForm />
      </Card>

      <Card className="space-y-3 p-4 sm:p-6">
        <SectionLabel icon={Download} hue={1}>
          Your data
        </SectionLabel>
        <p className="text-sm text-ink-3">Download everything you&apos;ve stored in Paisa: every entry, category, budget and setting.</p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/account/export?format=json" download className={buttonClassName("secondary", "md")}>
            <Download className="size-4" aria-hidden />
            All data (JSON)
          </a>
          <a href="/api/account/export?format=csv" download className={buttonClassName("secondary", "md")}>
            <Download className="size-4" aria-hidden />
            Entries (CSV)
          </a>
        </div>
      </Card>

      <Card className="space-y-3 p-4 sm:p-6">
        <SectionLabel icon={ShieldAlert} hue={8}>
          Delete account
        </SectionLabel>
        <DeleteAccount />
      </Card>
    </>
  );
}

function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setFormError(null);
    const parsed = changePasswordSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api("/api/account/password", { method: "POST", json: parsed.data });
      form.reset();
      toast.success("Password changed. Other devices have been signed out.");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) setFormError(err.message);
      } else setFormError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form onSubmit={onSubmit} noValidate className="space-y-4">
      <PasswordInput label="Current password" name="currentPassword" autoComplete="current-password" required error={errors.currentPassword} />
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordInput label="New password" name="newPassword" autoComplete="new-password" required showRequirements visible={visible} onVisibleChange={setVisible} error={errors.newPassword} />
        <PasswordInput label="Confirm new password" name="confirmPassword" autoComplete="new-password" required toggle={false} visible={visible} error={errors.confirmPassword} />
      </div>
      {formError && <FormError message={formError} />}
      <p className="text-xs text-ink-3">Changing it signs you out on every other device.</p>
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          Change password
        </Button>
      </div>
    </Form>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const parsed = deleteAccountSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api("/api/account", { method: "DELETE", json: parsed.data });
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard navigation on auth change: drops the previous session's client router cache / preserved route state
      window.location.assign("/signup");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) setFormError(err.message);
      } else setFormError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <p className="text-sm text-ink-3">
        Permanently erases your account and everything in it: entries, receipts, budgets, categories and settings. This can&apos;t be undone, so download your
        data first.
      </p>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" aria-hidden />
        Delete account…
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete your account?" description="All of your data is erased immediately and can't be recovered.">
        <Form onSubmit={onSubmit} noValidate className="space-y-4 pb-1" data-testid="delete-account-form">
          <PasswordInput label="Password" name="password" autoComplete="current-password" required error={errors.password} />
          <Input label="Type DELETE to confirm" name="confirm" autoComplete="off" autoCapitalize="characters" required error={errors.confirm} />
          {formError && <FormError message={formError} />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={loading}>
              Delete everything
            </Button>
          </div>
        </Form>
      </Dialog>
    </>
  );
}
