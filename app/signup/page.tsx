import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, authLinkClassName } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Start your hisaab"
      subtitle="Track UPI, cards and cash in one place. Takes 30 seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className={authLinkClassName}>
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
