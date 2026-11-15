import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, authLinkClassName } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forgot-form";
import { emailConfigured } from "@/lib/mail";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  const footer = (
    <>
      Remembered it?{" "}
      <Link href="/login" className={authLinkClassName}>
        Sign in
      </Link>
    </>
  );
  if (!emailConfigured()) {
    return (
      <AuthShell title="Forgot password" subtitle="Reset links are sent by email." footer={footer}>
        <p role="status" className="text-sm text-ink-2">
          Email isn&apos;t set up on this server yet, so reset links can&apos;t be sent. If you&apos;re signed in on another device, you can change your password
          from Preferences there.
        </p>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Forgot password" subtitle="Enter your email and we'll send you a link to set a new one." footer={footer}>
      <ForgotForm />
    </AuthShell>
  );
}
