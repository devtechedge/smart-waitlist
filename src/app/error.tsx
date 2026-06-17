"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Root Error Boundary
 * -------------------
 * Catches unhandled errors from any Server or Client Component in the
 * app. Shows a friendly message + a "try again" button that resets the
 * error boundary (re-mounting the failed segment).
 *
 * MUST be a Client Component (`"use client"`).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production you'd forward this to Sentry / Datadog / etc.
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md border-destructive/30">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" aria-hidden />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. You can try again, or head back
            home.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && error.message ? (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
              {error.message}
            </pre>
          ) : null}

          {error.digest ? (
            <p className="text-center text-xs text-muted-foreground">
              Error ID: <code className="font-mono">{error.digest}</code>
            </p>
          ) : null}

          <div className="flex justify-center gap-3">
            <Button onClick={reset} className="gap-1.5">
              <RotateCcw className="size-4" aria-hidden />
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
