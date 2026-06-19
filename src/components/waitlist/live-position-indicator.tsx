"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useLivePosition } from "@/hooks/use-live-position";

/**
 * LivePositionIndicator
 * ---------------------
 * Shows a pulsing "live" dot + last update time. Renders the realtime
 * subscription status so users know their position is being tracked.
 *
 * Also fires a toast when a new referral comes in.
 */
export type LivePositionIndicatorProps = {
  entryId: string;
  initialPosition: number;
  initialReferralCount: number;
  initialTotalUsers: number;
  className?: string;
};

export function LivePositionIndicator({
  entryId,
  initialPosition,
  initialReferralCount,
  initialTotalUsers,
  className,
}: LivePositionIndicatorProps) {
  const handleReferralIncrease = React.useCallback((newCount: number, oldCount: number) => {
    const diff = newCount - oldCount;
    toast.success(`🎉 Someone just used your link!`, {
      description: `You now have ${newCount} ${newCount === 1 ? "referral" : "referrals"} (+${diff})`,
    });
  }, []);

  const { isLive, lastUpdate, totalUsers } = useLivePosition({
    entryId,
    initialPosition,
    initialReferralCount,
    initialTotalUsers,
    onReferralIncrease: handleReferralIncrease,
  });

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      {isLive ? (
        <>
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="font-medium text-green-600 dark:text-green-400">Live</span>
          {totalUsers !== null && (
            <span>· {totalUsers.toLocaleString()} on the waitlist</span>
          )}
          {lastUpdate && (
            <span className="hidden sm:inline">
              · updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </>
      ) : (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden />
          <span>Connecting…</span>
        </>
      )}
    </div>
  );
}
