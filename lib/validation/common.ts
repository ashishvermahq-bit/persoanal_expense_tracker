import { z } from "./zod";
import { fromInputDate } from "@/lib/dates";
import { toPaise } from "@/lib/money";

export const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid id");

/**
 * Money from clients arrives either as integer paise (`amountPaise`) or as a
 * rupee string typed by a human (`amount`: "1,250.50"). Both normalise to paise.
 */
export const paiseSchema = z
  .number({ error: "Enter an amount" })
  .int("Amount must be whole paise")
  .min(1, "Amount must be greater than zero")
  .max(1_00_00_00_000_00, "Amount is too large"); // ₹100 crore

export const rupeeInputSchema = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    try {
      const paise = toPaise(typeof v === "number" ? v : v.trim());
      if (paise < 1) {
        ctx.addIssue({ code: "custom", message: "Amount must be greater than zero" });
        return z.NEVER;
      }
      return paise;
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
      return z.NEVER;
    }
  })
  .pipe(paiseSchema);

/** Accept `{ amountPaise: 45050 }` or `{ amount: "450.50" }`. */
export const amountFields = z
  .object({
    amountPaise: paiseSchema.optional(),
    amount: rupeeInputSchema.optional(),
  })
  .transform((v, ctx) => {
    const paise = v.amountPaise ?? v.amount;
    if (paise === undefined) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter an amount" });
      return z.NEVER;
    }
    return paise;
  });

/** "yyyy-mm-dd" (IST civil date) or an ISO instant → Date. */
export const dateInputSchema = z.string().transform((s, ctx) => {
  const civil = fromInputDate(s);
  if (civil) return civil;
  // A yyyy-mm-dd that fromInputDate rejected (e.g. 30 Feb) must not fall
  // through to Date(), which would silently roll it into the next month.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(NaN) : new Date(s);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: "custom", message: "Enter a valid date" });
    return z.NEVER;
  }
  return d;
});

export const tagsSchema = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(",")))
  .transform((arr) =>
    Array.from(new Set(arr.map((t) => t.trim().toLowerCase().slice(0, 30)).filter(Boolean))).slice(0, 20)
  );

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .optional();

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour");
