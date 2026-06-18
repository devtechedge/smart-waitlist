"use client";

import * as React from "react";
import { useTransition } from "react";
import { Check, Edit3, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateReferralCodeAction } from "@/app/actions/waitlist";
import { publicAppOrigin } from "@/lib/public-env";

/**
 * CustomReferralCodeEditor
 * ------------------------
 * Lets the user replace their auto-generated 6-char referral code with a
 * custom one (e.g. "ada-2024"). Shows the current code with an "Edit"
 * button; clicking opens an inline editor with live validation.
 *
 * Validation happens server-side via `updateReferralCodeAction` (Zod).
 * On success, the parent's `referralLink` prop should be refreshed —
 * simplest way is to call `router.refresh()` from the parent.
 */
export type CustomReferralCodeEditorProps = {
  currentCode: string;
  hasCustomCode: boolean;
  className?: string;
};

export function CustomReferralCodeEditor({
  currentCode,
  hasCustomCode,
  className,
}: CustomReferralCodeEditorProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState(currentCode);
  const [isPending, startTransition] = useTransition();

  // Keep `value` in sync with `currentCode` when not editing.
  // Using a key-based reset instead of an effect to avoid cascading renders.
  const displayValue = isEditing ? value : currentCode;

  function handleSave() {
    if (value === currentCode) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await updateReferralCodeAction(value);
      if (!result.ok) {
        toast.error(result.error ?? "Couldn't update your code.");
        return;
      }
      toast.success("Referral code updated!");
      setIsEditing(false);
      // Refresh server components to pick up the new code.
      window.location.reload();
    });
  }

  function handleCancel() {
    setValue(currentCode);
    setIsEditing(false);
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Your referral code</span>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="size-3" aria-hidden />
              {hasCustomCode ? "Edit" : "Customize"}
            </Button>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {hasCustomCode
            ? "Your custom code — share it far and wide."
            : "Make your link memorable with a custom code (e.g. your name)."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-md border border-input bg-background pr-3">
                <span className="pl-3 text-sm text-muted-foreground">
                  {publicAppOrigin()}/?ref=
                </span>
                <Input
                  value={displayValue}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={() => {
                    // Sync value with currentCode when entering edit mode.
                    if (value !== currentCode) setValue(currentCode);
                  }}
                  className="border-0 shadow-none focus-visible:ring-0"
                  autoFocus
                  maxLength={20}
                  disabled={isPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isPending || value.length < 3}
                className="gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Check className="size-3.5" aria-hidden />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                className="gap-1.5"
              >
                <X className="size-3.5" aria-hidden />
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              3–20 characters · letters, numbers, hyphens only
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-semibold">
              {currentCode}
            </code>
            {hasCustomCode && (
              <span className="text-xs text-muted-foreground">custom</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
