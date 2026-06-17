"use client";

import * as React from "react";
import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";

/**
 * SignOutButton
 * -------------
 * Triggers the `signOutAction` Server Action via `useTransition` (rather
 * than a native form submission) so we can show an inline loading state
 * and so the button can live in a navbar without needing a `<form>` wrapper.
 *
 * After the action completes, `signOutAction` calls `redirect("/")` —
 * React will then unmount this component as the navigation happens.
 */
export type SignOutButtonProps = {
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  /** Hide the text label (icon-only). */
  iconOnly?: boolean;
  /** Optional accessible label when `iconOnly` is true. */
  label?: string;
};

export function SignOutButton({
  className,
  variant = "ghost",
  size = "sm",
  iconOnly = false,
  label = "Sign out",
}: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await signOutAction();
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(iconOnly && "size-9 p-0", className)}
      onClick={handleClick}
      disabled={isPending}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <LogOut className="size-4" aria-hidden />
      )}
      {iconOnly ? null : <span>{isPending ? "Signing out…" : label}</span>}
    </Button>
  );
}
