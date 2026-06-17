import * as React from "react";
import {
  Users,
  Clock,
  MailCheck,
  Activity,
  Share2,
  Eye,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminStats } from "@/lib/queries/admin";

/**
 * StatsCards
 * ----------
 * Server Component. Renders the admin dashboard's summary metric cards in
 * a responsive grid. Each card shows an icon, label, big number, and a
 * short description.
 *
 * Props:
 *   - `stats` : the `AdminStats` object from `getAdminStats()`.
 */
export type StatsCardsProps = {
  stats: AdminStats;
  className?: string;
};

export function StatsCards({ stats, className }: StatsCardsProps) {
  const cards: Array<{
    icon: LucideIcon;
    label: string;
    value: number;
    description: string;
    accent: "default" | "blue" | "amber" | "green" | "purple" | "rose";
  }> = [
    {
      icon: Users,
      label: "Total entries",
      value: stats.totalEntries,
      description: "Everyone on the waitlist",
      accent: "default",
    },
    {
      icon: Clock,
      label: "Pending",
      value: stats.pendingCount,
      description: "Waiting for an invite",
      accent: "amber",
    },
    {
      icon: MailCheck,
      label: "Invited",
      value: stats.invitedCount,
      description: "Sent an invite email",
      accent: "blue",
    },
    {
      icon: Activity,
      label: "Activated",
      value: stats.activatedCount,
      description: "Signed up for the product",
      accent: "green",
    },
    {
      icon: Share2,
      label: "Total referrals",
      value: stats.totalReferrals,
      description: "Successful referral signups",
      accent: "purple",
    },
    {
      icon: Eye,
      label: "Link visits",
      value: stats.totalVisits,
      description: "Referral link clicks (all-time)",
      accent: "rose",
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        className,
      )}
    >
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}

/** Internal: single stat card. */
function StatCard({
  icon: Icon,
  label,
  value,
  description,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  description: string;
  accent: "default" | "blue" | "amber" | "green" | "purple" | "rose";
}) {
  const { iconBg, iconText } = accentStyles[accent];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">
          {label}
        </CardDescription>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            iconBg,
            iconText,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl font-bold tabular-nums">
          {value.toLocaleString()}
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

/** Accent color map for icon backgrounds. */
const accentStyles = {
  default: {
    iconBg: "bg-primary/10",
    iconText: "text-primary",
  },
  blue: {
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-600 dark:text-blue-400",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  green: {
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600 dark:text-emerald-400",
  },
  purple: {
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-600 dark:text-purple-400",
  },
  rose: {
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-600 dark:text-rose-400",
  },
} as const;
