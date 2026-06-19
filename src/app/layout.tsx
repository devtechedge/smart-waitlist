import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Smart Waitlist & Referral Engine",
    template: "%s · Smart Waitlist",
  },
  description:
    "A production-ready SaaS waitlist with built-in viral referral mechanics. Built with Next.js 16, Supabase, Drizzle ORM, and shadcn/ui.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    title: "Smart Waitlist & Referral Engine",
    description:
      "Launch your product with a viral waitlist. Sign up, share your referral link, and climb the queue.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Waitlist & Referral Engine",
    description:
      "Launch your product with a viral waitlist. Sign up, share your referral link, and climb the queue.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
