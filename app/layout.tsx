import type { Metadata, Viewport } from "next";
import { AppToaster } from "@/components/theme/app-toaster";
import { MotionRoot } from "@/components/theme/motion";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { PWAInit } from "./pwa-init";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Paisa — Expense Tracker", template: "%s · Paisa" },
  description: "Track where your money goes each month. Built for India: UPI, cards, cash, FY reports and tax tags.",
  manifest: "/manifest.json",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Paisa",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set by the boot script before hydration, hence suppressHydrationWarning.
    <html lang="en-IN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <PWAInit />
        <MotionRoot />
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
