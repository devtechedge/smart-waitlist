"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Lock, Check, Crown, Sparkles, Users, Network, TrendingUp, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * MilestoneRewards
 * ----------------
 * Displays a vertical timeline of milestone rewards the user can unlock
 * by reaching referral count thresholds. Unlocked milestones glow + show
 * a check mark; locked ones are dimmed with a lock icon.
 *
 * Props:
 *   - milestones: from `getMilestonesForUser()` (with `unlocked` status)
 *   - currentReferralCount: the user's current referral count (for progress)
 */
export type Milestone = {
  id: string;
  threshold: number;
  title: string;
  description: string;
  perk: string;
  badgeIcon: string | null;
  unlocked: boolean;
  unlockedAt: Date | null;
};

export type MilestoneRewardsProps = {
  milestones: Milestone[];
  currentReferralCount: number;
  className?: string;
};

const ICON_MAP: Record<string, typeof Crown> = {
  Crown,
  Sparkles,
  Users,
  Network,
  TrendingUp,
  Trophy,
};

export function MilestoneRewards({ milestones, currentReferralCount, className }: MilestoneRewardsProps) {
  // Find the next milestone to unlock (for progress bar)
  const nextMilestone = milestones.find((m) => !m.unlocked);
  const prevThreshold = nextMilestone
    ? milestones[milestones.indexOf(nextMilestone) - 1]?.threshold ?? 0
    : 0;
  const progressToNext = nextMilestone
    ? Math.min(100, ((currentReferralCount - prevThreshold) / (nextMilestone.threshold - prevThreshold)) * 100)
    : 100;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="size-5 text-amber-500" aria-hidden />
          Milestone Rewards
        </CardTitle>
        <CardDescription>
          Unlock perks as you refer more friends. {nextMilestone
            ? `${nextMilestone.threshold - currentReferralCount} more referrals to unlock "${nextMilestone.title}"`
            : "All milestones unlocked — you're a legend!"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress to next milestone */}
        {nextMilestone && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentReferralCount} referrals</span>
              <span>Next: {nextMilestone.title}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* Milestone timeline */}
        <div className="space-y-3">
          {milestones.map((milestone, i) => {
            const Icon = ICON_MAP[milestone.badgeIcon ?? ""] ?? Trophy;
            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "relative flex items-center gap-4 rounded-lg border p-3 transition-all",
                  milestone.unlocked
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border opacity-60",
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-full",
                    milestone.unlocked
                      ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-500"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {milestone.unlocked ? (
                    <Icon className="size-6" />
                  ) : (
                    <Lock className="size-5" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{milestone.title}</span>
                    {milestone.unlocked && (
                      <Check className="size-4 text-green-500" aria-hidden />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{milestone.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {milestone.perk}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {milestone.threshold} referrals
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
