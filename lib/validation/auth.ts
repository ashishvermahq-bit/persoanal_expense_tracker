import { z } from "zod";

// Normalise first, then validate — Zod runs format checks before transforms otherwise.
export const emailSchema = z
  .string({ error: "Enter a valid email address" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }).max(254));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Use at least one letter and one number");

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
