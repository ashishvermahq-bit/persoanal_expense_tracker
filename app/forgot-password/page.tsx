import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthShell, authLinkClassName } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forgot-form";
import { emailConfigured } from "@/lib/mail";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a link to set a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className={authLinkClassName}>
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <ForgotBody />
      </Suspense>
    </AuthShell>
  );
}

/**
 * Decided per request, not at build time: a Docker image is built without the
 * runtime secrets, so a build-time check would always say email is off.
 */
async function ForgotBody() {
  await connection();
  if (!emailConfigured()) {
    return (
      <p role="status" className="text-sm text-ink-2">
        Email isn&apos;t set up on this server yet, so reset links can&apos;t be sent. If you&apos;re signed in on another device, you can change your password from
        Preferences there.
      </p>
    );
  }
  return <ForgotForm />;
}

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-[70px] animate-pulse rounded-lg bg-raised" />
      <div className="h-12 animate-pulse rounded-lg bg-raised" />
    </div>
  );
}
