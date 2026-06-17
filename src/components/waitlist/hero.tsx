import * as React from "react";
import { ArrowRight, Users, Zap, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Hero
 * ----
 * Landing-page hero section. Server Component (no client interactivity).
 * Renders the headline, sub-headline, social proof (total waitlist count),
 * and a row of feature bullets. The signup CTA is rendered by the parent
 * page so it can be wired to the SignupForm (which needs `"use client"`).
 *
 * Props:
 *   - `totalUsers` : live count from `getLandingStats()`. `null` if the DB
 *                    is unreachable — the badge is omitted gracefully.
 *   - `className`  : optional extra classes for the root element.
 *   - `children`   : slot for the primary CTA (SignupForm or "Go to dashboard" button).
 */
export type HeroProps = {
  totalUsers: number | null;
  className?: string;
  children?: React.ReactNode;
};

export function Hero({ totalUsers, className, children }: HeroProps) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden",
        "mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-16 text-center",
        "md:py-24",
        className,
      )}
    >
      {/* Decorative background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-80 w-[80%] max-w-3xl rounded-full bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent blur-3xl"
      />

      {totalUsers !== null && totalUsers > 0 ? (
        <Badge
          variant="secondary"
          className="mb-6 gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
        >
          <Users className="size-3.5" aria-hidden />
          Join {totalUsers.toLocaleString()} {totalUsers === 1 ? "person" : "people"} on the waitlist
        </Badge>
      ) : null}

      <h1
        className={cn(
          "max-w-4xl text-balance text-4xl font-bold tracking-tight",
          "sm:text-5xl md:text-6xl lg:text-7xl",
        )}
      >
        Skip the line.
        <br />
        <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Bring your friends.
        </span>
      </h1>

      <p
        className={cn(
          "mt-6 max-w-2xl text-pretty text-base text-muted-foreground",
          "sm:text-lg md:text-xl",
        )}
      >
        Get early access to the product launch everyone&apos;s talking about.
        Share your unique referral link, climb the queue, and unlock perks
        as you rise.
      </p>

      <div className="mt-8 flex w-full max-w-md flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {children}
      </div>

      <div
        className={cn(
          "mt-14 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3",
        )}
      >
        <FeatureBullet
          icon={<Zap className="size-4" aria-hidden />}
          title="Instant signup"
          description="Join the waitlist in under 30 seconds — just email and a password."
        />
        <FeatureBullet
          icon={<Users className="size-4" aria-hidden />}
          title="Viral referrals"
          description="Every friend who signs up with your link moves you up the queue."
        />
        <FeatureBullet
          icon={<Trophy className="size-4" aria-hidden />}
          title="Climb the ranks"
          description="Top referrers get first access, exclusive perks, and founder shoutouts."
        />
      </div>
    </section>
  );
}

/** Internal: small feature bullet used in the hero's feature row. */
function FeatureBullet({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-4 text-center backdrop-blur-sm">
      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

/** Re-export the arrow icon for convenience in the parent page. */
export { ArrowRight };
