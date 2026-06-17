import * as React from "react";
import { Gift, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * ReferralBanner
 * --------------
 * Server Component. Shown at the top of the landing page when the visitor
 * arrived via a referral link (`/?ref=CODE`). Displays the referrer's name
 * (or a generic "a friend" if the code couldn't be resolved).
 *
 * The banner is intentionally NOT dismissible on the server (no client
 * state). If you want a dismissible variant, wrap this in a client
 * component with a `useState` + `localStorage` flag — but for viral
 * clarity we keep the banner persistent.
 *
 * Props:
 *   - `referrerName` : the referrer's display name (from `resolveReferralCode`).
 *                      `null` means the code was invalid/expired — render nothing.
 *   - `className`    : optional extra classes.
 */
export type ReferralBannerProps = {
  referrerName: string | null;
  className?: string;
};

export function ReferralBanner({
  referrerName,
  className,
}: ReferralBannerProps) {
  // Don't render anything if the referral code was invalid.
  if (!referrerName) return null;

  return (
    <div
      role="status"
      className={cn(
        "relative isolate w-full overflow-hidden",
        "border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-3 px-6 py-3 text-center text-sm">
        <Badge
          variant="default"
          className="shrink-0 gap-1.5 rounded-full px-2.5 py-0.5"
        >
          <Gift className="size-3" aria-hidden />
          Referral
        </Badge>

        <p className="text-pretty text-foreground">
          <span className="font-semibold">{referrerName}</span> invited you —
          sign up to skip ahead in the queue.
        </p>
      </div>

      {/* Decorative shimmer line at the bottom */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />
    </div>
  );
}

/** Re-export the X icon in case the parent wants a dismiss variant. */
export { X };
