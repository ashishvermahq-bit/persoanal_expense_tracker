import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage(props: PageProps<"/login">) {
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
      <Suspense fallback={<LoginForm />}>
        <LoginFormWithNext searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginFormWithNext({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return <LoginForm nextPath={next} />;
}
