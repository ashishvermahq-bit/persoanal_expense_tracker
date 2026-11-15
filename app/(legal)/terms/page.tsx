import type { Metadata } from "next";
import Link from "next/link";
import { DraftNote } from "../draft-note";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of use</h1>
      <DraftNote />
      <p>By creating an account you agree to these terms.</p>

      <h2>The service</h2>
      <p>
        Paisa helps you record and review your own spending and income. It doesn&apos;t connect to your bank, move money or make payments. You enter everything
        yourself.
      </p>

      <h2>Not financial or tax advice</h2>
      <p>
        Reports, budgets and tax-section tags (such as 80C and 80D) are for your own organisation. They are not financial, investment or tax advice; please check
        with a qualified professional before filing.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your password to yourself. You&apos;re responsible for activity on your account.</li>
        <li>Give accurate sign-up details, and use Paisa only for lawful, personal purposes.</li>
        <li>Don&apos;t try to access other people&apos;s data or disrupt the service.</li>
      </ul>

      <h2>Your data</h2>
      <p>
        You own what you enter. You can download it or delete your account at any time from Preferences. How we handle it is described in the{" "}
        <Link href="/privacy" className="font-semibold text-primary-ink underline-offset-4 hover:underline">
          privacy policy
        </Link>
        .
      </p>

      <h2>Availability</h2>
      <p>
        We work to keep Paisa running and your data safe, but the service is provided as it is, without guarantees of uninterrupted availability. Keep your own
        export of anything you can&apos;t afford to lose.
      </p>

      <h2>Changes</h2>
      <p>If these terms change, we&apos;ll update this page and the date below.</p>
      <p className="text-xs text-ink-3">Last updated: [date to be set at launch]</p>
    </>
  );
}
