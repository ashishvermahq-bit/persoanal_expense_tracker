"use client";

import { Form } from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ApiClientError, api } from "@/lib/client";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import type { PreferencesDTO } from "@/types/dto";
import { PAYMENT_METHODS, FY_STARTS, THEMES, LOCALES } from "@/types/models";

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
];

const FY_START_LABELS = {
  april: "April (FY 2025-26 = Apr 2025 – Mar 2026)",
  january: "January (Calendar year)",
};

const THEME_LABELS = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const LOCALE_LABELS = {
  "en-IN": "English (India)",
  "hi-IN": "हिन्दी (India)",
};

export function PreferencesForm({ preferences }: { preferences: PreferencesDTO }) {
  const router = useRouter();
  const [theme, setTheme] = useState(preferences.theme);
  const [timezone, setTimezone] = useState(preferences.timezone);
  const [locale, setLocale] = useState(preferences.locale);
  const [fyStart, setFyStart] = useState(preferences.fyStart);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(preferences.defaultPaymentMethod);
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(preferences.budgetAlertsEnabled);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api<PreferencesDTO>("/api/preferences", {
        method: "PATCH",
        json: {
          theme,
          timezone,
          locale,
          fyStart,
          defaultPaymentMethod,
          budgetAlertsEnabled,
        },
      });

      toast.success("Preferences saved");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.fields && !Object.keys(err.fields).length) toast.error(err.message);
      } else toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Theme" value={theme} onChange={(e) => setTheme(e.target.value as "system" | "light" | "dark")}>
          {THEMES.map((t) => (
            <option key={t} value={t}>
              {THEME_LABELS[t]}
            </option>
          ))}
        </Select>

        <Select label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Language" value={locale} onChange={(e) => setLocale(e.target.value as "en-IN" | "hi-IN")}>
          {LOCALES.map((loc) => (
            <option key={loc} value={loc}>
              {LOCALE_LABELS[loc]}
            </option>
          ))}
        </Select>

        <Select
          label="Financial Year"
          value={fyStart}
          onChange={(e) => setFyStart(e.target.value as "april" | "january")}
          hint="Used for FY reports and tax summaries."
        >
          {FY_STARTS.map((fy) => (
            <option key={fy} value={fy}>
              {FY_START_LABELS[fy]}
            </option>
          ))}
        </Select>
      </div>

      <Select
        label="Default Payment Method"
        value={defaultPaymentMethod}
        onChange={(e) => setDefaultPaymentMethod(e.target.value as "upi" | "debit_card" | "credit_card" | "cash" | "net_banking" | "wallet" | "emi" | "other")}
      >
        {PAYMENT_METHODS.map((p) => (
          <option key={p} value={p}>
            {PAYMENT_METHOD_LABELS[p]}
          </option>
        ))}
      </Select>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={budgetAlertsEnabled}
          onChange={(e) => setBudgetAlertsEnabled(e.target.checked)}
          className="rounded border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Enable budget alerts</span>
      </label>

      <div className="flex justify-end gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Button type="submit" loading={loading} data-testid="save-preferences">
          Save preferences
        </Button>
      </div>
    </Form>
  );
}
