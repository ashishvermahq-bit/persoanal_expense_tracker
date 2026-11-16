import type { Metadata } from "next";
import Link from "next/link";
import { DraftNote } from "../draft-note";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <DraftNote />
      <p>Paisa is a personal expense tracker. This page explains what it stores, why, and what you can do about it.</p>

      <h2>What we store</h2>
      <ul>
        <li>Your account: name, email address, and your password as a one-way bcrypt hash (we can&apos;t read it).</li>
        <li>What you enter: expenses, income, categories, budgets, recurring payments, notes, tags and tax sections.</li>
        <li>Receipts you choose to upload (images or PDFs).</li>
        <li>Your settings, such as theme, financial-year start and default payment method.</li>
        <li>Security records: when you last signed in, and short-lived counters of sign-in attempts by email and IP address, used to stop password guessing. These expire within about 15 minutes.</li>
      </ul>

      <h2>Why</h2>
      <p>Only to run the app for you: to show your spending, budgets and reports, and to keep your account secure. We don&apos;t sell your data, show ads, or use third-party analytics or tracking.</p>

      <h2>Cookies and device storage</h2>
      <p>
        One essential cookie keeps you signed in (it lasts up to 7 days and is cleared when you sign out). Your theme choice is also kept in your browser&apos;s local
        storage. There are no advertising or analytics cookies.
      </p>

      <h2>Who can see it</h2>
      <p>
        Only you, when signed in. Your data is stored with our hosting and database providers, who process it on our behalf to run the service. If you ask
        to reset your password, your email address is passed to our email delivery provider to send the link. It is never shared with anyone else unless
        the law requires it.
      </p>

      <h2>Your rights</h2>
      <p>Under India&apos;s Digital Personal Data Protection Act, 2023, you can:</p>
      <ul>
        <li>
          <strong className="text-ink">Access and take your data</strong>: download everything as JSON or CSV from Preferences → Your data.
        </li>
        <li>
          <strong className="text-ink">Correct it</strong>: edit any entry, category or setting in the app.
        </li>
        <li>
          <strong className="text-ink">Erase it</strong>: Preferences → Delete account removes your account and all its data immediately.
        </li>
      </ul>

      <h2>Retention</h2>
      <p>
        We keep your data while your account exists. Entries you delete are hidden straight away and kept with your account so they can be undone; deleting your
        account erases everything, including them.
      </p>

      <h2>Contact</h2>
      <p>For questions or grievances about your data, contact the Grievance Officer at [contact to be added before launch].</p>

      <p className="pt-4">
        See also the{" "}
        <Link href="/terms" className="font-semibold text-primary-ink underline-offset-4 hover:underline">
          terms of use
        </Link>
        .
      </p>
    </>
  );
}
