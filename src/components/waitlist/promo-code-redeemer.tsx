"use client";

import * as React from "react";
import { useTransition } from "react";
import { Ticket, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redeemPromoCodeAction } from "@/app/actions/promo-codes";

/**
 * PromoCodeRedeemer
 * ----------------
 * Lets a user enter a VIP promo code to instantly upgrade their tier.
 * Shows a success state + auto-reloads on success.
 */
export type PromoCodeRedeemerProps = {
  className?: string;
};

export function PromoCodeRedeemer({ className }: PromoCodeRedeemerProps) {
  const [code, setCode] = React.useState("");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = React.useState(false);

  function handleRedeem() {
    if (!code.trim()) return;

    startTransition(async () => {
      const result = await redeemPromoCodeAction(code);
      if (!result.ok) {
        toast.error(result.error ?? "Invalid promo code");
        return;
      }
      setSuccess(true);
      toast.success(`Upgraded to ${result.newTier} tier! 🎉`);
      setTimeout(() => window.location.reload(), 1500);
    });
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ticket className="size-4 text-indigo-400" aria-hidden />
          Have a promo code?
        </CardTitle>
        <CardDescription className="text-xs">
          Enter a VIP code to instantly upgrade your tier.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-600 dark:text-green-400">
            <Check className="size-4" aria-hidden />
            Tier upgraded! Reloading…
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER-CODE"
              className="font-mono uppercase"
              disabled={isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRedeem();
              }}
            />
            <Button
              size="sm"
              onClick={handleRedeem}
              disabled={isPending || !code.trim()}
              className="gap-1.5"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Ticket className="size-3.5" />}
              Redeem
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
