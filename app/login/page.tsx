import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, authLinkClassName } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Pick up where your money left off."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className={authLinkClassName}>
            Create an account
          </Link>
        </>
      }
    >
      {/* LoginForm reads ?next= via useSearchParams, which needs a Suspense boundary.
          The fallback is a skeleton the same height as the form, never a second form:
          a form that gets swapped out would lose anything the user had already typed. */}
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-[70px] animate-pulse rounded-lg bg-raised" />
      <div className="h-[70px] animate-pulse rounded-lg bg-raised" />
      <div className="h-12 animate-pulse rounded-lg bg-raised" />
    </div>
  );
}
