"use client";

import * as React from "react";
import { useTransition } from "react";
import { Check, Crown, Loader2, Rocket, Sparkles, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type TierUpgradeCardProps = {
  currentTier: "free" | "pro" | "founder";
  className?: string;
};

type TierInfo = {
  id: "free" | "pro" | "founder";
  name: string;
  price: string;
  icon: typeof Crown;
  perks: string[];
  highlight?: boolean;
  accentClass: string;
};

const TIERS: TierInfo[] = [
  {
    id: "free", name: "Free", price: "$0", icon: Rocket,
    perks: ["Standard waitlist position", "Unique referral link", "Climb the queue with referrals"],
    accentClass: "border-border",
  },
  {
    id: "pro", name: "Pro", price: "$19", icon: Sparkles,
    perks: ["Priority queue position", "Custom referral code", "Early access to features", "Email referral notifications"],
    highlight: true, accentClass: "border-blue-500/50 ring-2 ring-blue-500/20",
  },
  {
    id: "founder", name: "Founder", price: "$99", icon: Crown,
    perks: ["Highest priority", "Lifetime access", "Custom referral code", "Founder badge", "Direct line to founders"],
    accentClass: "border-amber-500/50 ring-2 ring-amber-500/20",
  },
];

export function TierUpgradeCard({ currentTier, className }: TierUpgradeCardProps) {
  const [isPending, startTransition] = useTransition();

  async function handleUpgrade(tier: "pro" | "founder") {
    startTransition(async () => {
      try {
        // Try Stripe checkout first
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
        });

        if (res.status === 501) {
          // Stripe not configured — fall back to demo instant upgrade
          const { upgradeTierAction } = await import("@/app/actions/waitlist");
          const result = await upgradeTierAction(tier);
          if (!result.ok) {
            toast.error(result.error ?? "Upgrade failed");
            return;
          }
          toast.success(`Upgraded to ${tier}! (demo mode)`);
          window.location.reload();
          return;
        }

        if (!res.ok) {
          toast.error("Failed to start checkout");
          return;
        }

        const data = await res.json() as { url: string };
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } catch (err) {
        console.error("[tier upgrade] error", err);
        toast.error("Something went wrong");
      }
    });
  }

  const priority = { free: 1, pro: 2, founder: 3 } as const;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Crown className="size-5 text-amber-500" aria-hidden />
          Early Access Tiers
        </CardTitle>
        <CardDescription>
          Upgrade to jump ahead of the queue. Higher tiers rank above all Free users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const isCurrent = currentTier === tier.id;
            const isUpgrade = priority[tier.id] > priority[currentTier];
            return (
              <div key={tier.id} className={cn("relative flex flex-col rounded-lg border p-4 transition-all", tier.accentClass, isCurrent && "ring-2 ring-green-500/30")}>
                {tier.highlight && !isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Popular</span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Your plan</span>
                )}
                <div className="mb-3 flex items-center gap-2">
                  <div className={cn("flex size-9 items-center justify-center rounded-lg",
                    tier.id === "free" && "bg-muted text-muted-foreground",
                    tier.id === "pro" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    tier.id === "founder" && "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div>
                    <div className="font-semibold">{tier.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {tier.price}{tier.id !== "free" && tier.id !== "founder" && <span className="text-xs"> /mo</span>}
                      {tier.id === "founder" && <span className="text-xs"> one-time</span>}
                    </div>
                  </div>
                </div>
                <ul className="mb-4 space-y-1.5 flex-1">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-1.5 text-xs">
                      <Check className="mt-0.5 size-3 shrink-0 text-green-500" aria-hidden />
                      <span className="text-muted-foreground">{perk}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="secondary" size="sm" disabled className="w-full gap-1.5">
                    <Check className="size-3.5" aria-hidden /> Current plan
                  </Button>
                ) : isUpgrade ? (
                  <Button size="sm" className="w-full gap-1.5" onClick={() => handleUpgrade(tier.id as "pro" | "founder")} disabled={isPending} variant={tier.highlight ? "default" : "outline"}>
                    {isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <CreditCard className="size-3.5" aria-hidden />}
                    Upgrade to {tier.name}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" disabled className="w-full">Lower tier</Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
