"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Mail, Lock, User, Gift } from "lucide-react";
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
import { GitHubOAuthButton } from "@/components/waitlist/github-oauth-button";
import { signUpAction, type ActionState } from "@/app/actions/auth";

/**
 * SignupForm
 * ----------
 * Client component that drives the `signUpAction` Server Action via
 * `useActionState`. Renders email + password + full-name fields and an
 * optional referral-code field (pre-filled from a `?ref=` cookie set by
 * the landing page).
 *
 * Validation is performed server-side via Zod (in `signUpAction`); this
 * component is responsible only for surfacing the returned `error` +
 * `field` hints next to the right input.
 *
 * Props:
 *   - `defaultRefCode` : pre-fills the referral-code field (from `?ref=` URL).
 *   - `redirectPath`   : hidden field forwarded to the action for post-signup redirect.
 */
export type SignupFormProps = {
  defaultRefCode?: string;
  redirectPath?: string;
  className?: string;
};

export function SignupForm({
  defaultRefCode = "",
  redirectPath = "/dashboard",
  className,
}: SignupFormProps) {
  // `useActionState` (React 19) — formerly `useFormState`.
  // Initial state has `ok: true` so the button isn't disabled on first paint.
  const [state, formAction, isPending] = useActionState<
    ActionState,
    FormData
  >(signUpAction, { ok: true });

  // Surface server-returned errors as toasts (non-field errors only).
  React.useEffect(() => {
    if (!state.ok && state.field === "form" && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Join the waitlist</CardTitle>
        <CardDescription>
          Create your account and claim your spot in line.
        </CardDescription>
      </CardHeader>

      <form action={formAction} className="contents" noValidate>
        <CardContent className="space-y-4">
          <input type="hidden" name="redirect" value={redirectPath} />
          {defaultRefCode ? (
            <input type="hidden" name="refCode" value={defaultRefCode} />
          ) : null}

          {/* Full name */}
          <Field
            id="fullName"
            label="Full name"
            icon={<User className="size-4" aria-hidden />}
            error={!state.ok && state.field === "fullName" ? state.error : undefined}
          >
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Ada Lovelace"
              disabled={isPending}
              required
              aria-invalid={!state.ok && state.field === "fullName"}
            />
          </Field>

          {/* Email */}
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

          {/* Password */}
          <Field
            id="password"
            label="Password"
            icon={<Lock className="size-4" aria-hidden />}
            error={
              !state.ok && state.field === "password" ? state.error : undefined
            }
            hint="At least 8 characters with upper, lower, and a number."
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              disabled={isPending}
              required
              minLength={8}
              aria-invalid={!state.ok && state.field === "password"}
            />
          </Field>

          {/* Optional referral code (only shown if no `?ref=` pre-fill) */}
          {!defaultRefCode ? (
            <Field
              id="refCode"
              label="Referral code (optional)"
              icon={<Gift className="size-4" aria-hidden />}
              error={
                !state.ok && state.field === "refCode" ? state.error : undefined
              }
            >
              <Input
                id="refCode"
                name="refCode"
                type="text"
                placeholder="e.g. k3f9a2"
                disabled={isPending}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={!state.ok && state.field === "refCode"}
              />
            </Field>
          ) : null}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Creating account…
              </>
            ) : (
              "Join the waitlist"
            )}
          </Button>

          <div className="flex w-full items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <GitHubOAuthButton
            refCode={defaultRefCode || undefined}
            redirectPath={redirectPath}
            label="signup"
            className="w-full"
          />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

/** Internal: labeled field with icon + error + hint. */
function Field({
  id,
  label,
  icon,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  error?: string;
  hint?: string;
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
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
