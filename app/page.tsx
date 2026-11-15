import { redirect } from "next/navigation";

// proxy.ts already redirects "/" based on the session cookie; this is the
// fallback for environments where the proxy does not run.
export default function Home() {
  redirect("/dashboard");
}
