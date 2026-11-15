import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your expense tracker"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            Sign up
          </Link>
        </>
      }
    >
      {/* LoginForm reads ?next= via useSearchParams, which needs a Suspense boundary.
          The fallback is a skeleton, never a second form: a form that gets swapped
          out would lose anything the user had already typed. */}
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="h-[66px] animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-[66px] animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-10 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}
