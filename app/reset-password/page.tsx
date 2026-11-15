import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, authLinkClassName } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Set a new password", referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      subtitle="You'll be signed out everywhere and can sign in with the new one."
      footer={
        <>
          Link expired?{" "}
          <Link href="/forgot-password" className={authLinkClassName}>
            Get a new one
          </Link>
        </>
      }
    >
      {/* ResetForm reads ?token= via useSearchParams, which needs a Suspense boundary. */}
      <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-raised" aria-hidden />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
