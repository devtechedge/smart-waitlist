import * as React from "react";
import { Trophy, TrendingUp, Users, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPosition, formatRelativeTime } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "@/components/waitlist/tier-badge";

/**
 * PositionCard
 * ------------
 * Server Component. The hero element of the `/dashboard` page — shows the
 * user's current waitlist position prominently, plus three secondary stats:
 * total users, referral count, and time on waitlist.
 *
 * Props:
 *   - `position`     : 1-indexed position in the queue.
 *   - `totalUsers`   : total entries on the waitlist (denominator).
 *   - `referralCount`: how many people the user has referred.
 *   - `joinedAt`     : when the user joined (Date or ISO string).
 *   - `status`       : waitlist status badge ("pending" | "invited" | "activated").
 */
export type PositionCardProps = {
  position: number;
  totalUsers: number;
  referralCount: number;
  joinedAt: Date | string;
  status: "pending" | "invited" | "activated";
  tier: "free" | "pro" | "founder";
  className?: string;
};

export function PositionCard({
  position,
  totalUsers,
  referralCount,
  joinedAt,
  status,
  tier,
  className,
}: PositionCardProps) {
  const percentile =
    totalUsers > 0 ? Math.round((position / totalUsers) * 100) : 100;
  const isTop10 = position <= 10 && position > 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground">
            Your position
          </CardDescription>
          <CardTitle className="flex items-baseline gap-2 text-5xl font-bold tabular-nums">
            {formatPosition(position)}
            <span className="text-lg font-medium text-muted-foreground">
              of {totalUsers.toLocaleString()}
            </span>
          </CardTitle>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <TierBadge tier={tier} />
          <StatusBadge status={status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar: visualizes percentile */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Front of the line</span>
            <span>Back of the line</span>
          </div>
          <div
            className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percentile}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Your position in the waitlist"
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full bg-primary transition-all",
                "bg-gradient-to-r from-primary to-primary/70",
              )}
              style={{ width: `${Math.max(2, 100 - percentile)}%` }}
            />
            {/* Position marker */}
            <div
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
              style={{ left: `${Math.max(2, Math.min(98, 100 - percentile))}%` }}
              aria-hidden
            />
          </div>
        </div>

        {isTop10 ? (
          <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            <Trophy className="size-4" aria-hidden />
            You&apos;re in the top 10 — keep sharing to stay ahead!
          </div>
        ) : null}

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
          <Stat
            icon={<TrendingUp className="size-4" aria-hidden />}
            label="Referrals"
            value={referralCount.toLocaleString()}
          />
          <Stat
            icon={<Users className="size-4" aria-hidden />}
            label="Total users"
            value={totalUsers.toLocaleString()}
          />
          <Stat
            icon={<Clock className="size-4" aria-hidden />}
            label="Joined"
            value={formatRelativeTime(joinedAt)}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** Internal: status badge with color per status. */
function StatusBadge({ status }: { status: PositionCardProps["status"] }) {
  const label =
    status === "pending"
      ? "Waiting"
      : status === "invited"
        ? "Invited"
        : "Activated";

  const variant =
    status === "pending"
      ? "secondary"
      : status === "invited"
        ? "default"
        : "outline";

  return (
    <Badge variant={variant} className="shrink-0">
      {label}
    </Badge>
  );
}

/** Internal: small stat tile. */
function Stat({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border/60 bg-card/40 p-3",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
