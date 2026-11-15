"use client";

import { Form } from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, api } from "@/lib/client";
import { signupSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/fields";

export function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

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
      const { user } = await api<{ user: { name: string } }>("/api/auth/signup", { method: "POST", json: parsed.data });
      toast.success(`Account created. Welcome, ${user.name.split(" ")[0]}!`);
      router.replace("/dashboard");
      router.refresh();
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
    <Form onSubmit={onSubmit} noValidate className="space-y-5" data-testid="signup-form">
      <Input label="Full name" name="name" autoComplete="name" required placeholder="Priya Sharma" error={errors.name} />
      <Input label="Email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" error={errors.email} />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        placeholder="••••••••"
        error={errors.password}
        hint={errors.password ? undefined : "At least 8 characters with a letter and a number"}
      />
      <Input label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" required placeholder="••••••••" error={errors.confirmPassword} />
      {formError && (
        <p role="alert" data-testid="form-error" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </p>
      )}
      <Button type="submit" loading={loading} className="mt-1 w-full">
        Create account
      </Button>
    </Form>
  );
}
