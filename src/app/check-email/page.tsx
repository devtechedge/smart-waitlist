import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Check your email",
  description: "Confirm your email address to activate your waitlist spot.",
  robots: { index: false, follow: false },
};

// This page has no dynamic data — but keep it fresh so the meta is current.
export const revalidate = 0;

export default function CheckEmailPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-7" aria-hidden />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to your inbox. Click it to activate
            your waitlist spot.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Didn&apos;t get the email? Check your spam folder, or wait a
            couple of minutes — sometimes there&apos;s a small delay.
          </p>
          <p>
            Once you confirm, you&apos;ll be redirected back to your
            dashboard where you can grab your unique referral link.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button asChild variant="outline" className="w-full">
            <Link href="/signin">Back to sign in</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Wrong email address?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign up again
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
