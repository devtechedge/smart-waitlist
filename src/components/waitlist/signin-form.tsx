"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { signInAction, type ActionState } from "@/app/actions/auth";

/**
 * SignInForm
 * ----------
 * Client component that drives the `signInAction` Server Action via
 * `useActionState`. Mirrors the SignupForm layout for visual consistency.
 *
 * Props:
 *   - `redirectPath` : where to go after successful sign-in (defaults to `/dashboard`).
 */
export type SignInFormProps = {
  redirectPath?: string;
  className?: string;
};

export function SignInForm({
  redirectPath = "/dashboard",
  className,
}: SignInFormProps) {
  const [state, formAction, isPending] = useActionState<
    ActionState,
    FormData
  >(signInAction, { ok: true });

  React.useEffect(() => {
    if (!state.ok && state.field === "form" && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to check your waitlist position.</CardDescription>
      </CardHeader>

      <form action={formAction} className="contents" noValidate>
        <CardContent className="space-y-4">
          <input type="hidden" name="redirect" value={redirectPath} />

          <Field
            id="email"
            label="Email"
            icon={<Mail className="size-4" aria-hidden />}
            error={!state.ok && state.field === "email" ? state.error : undefined}
          >
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              disabled={isPending}
              required
              aria-invalid={!state.ok && state.field === "email"}
            />
          </Field>

          <Field
            id="password"
            label="Password"
            icon={<Lock className="size-4" aria-hidden />}
            error={!state.ok && state.field === "password" ? state.error : undefined}
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isPending}
              required
              aria-invalid={!state.ok && state.field === "password"}
            />
          </Field>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>

          <div className="flex w-full items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Join the waitlist
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

/** Internal: labeled field with icon + error. */
function Field({
  id,
  label,
  icon,
  error,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        {icon ? (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <div className={cn(icon && "[&_input]:pl-9")}>{children}</div>
      </div>
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
