import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create an account"
      subtitle="Start tracking where your money goes"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
