"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Eye, UserPlus, Share2, Crown, TrendingDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * ConversionFunnel
 * ----------------
 * Visualizes the signup funnel:
 *   Link Visits → Signups → Referrals Made → Paid Upgrades
 *
 * Each stage shows the count + conversion rate from the previous stage.
 * The bars narrow visually to represent the funnel shape.
 *
 * Props:
 *   - data: from `getFunnelData()`
 */
export type FunnelData = {
  visits: number;
  signups: number;
  referrals: number;
  upgraded: number;
  conversionRate: number;
  referralRate: number;
  upgradeRate: number;
};

export type ConversionFunnelProps = {
  data: FunnelData;
  className?: string;
};

export function ConversionFunnel({ data, className }: ConversionFunnelProps) {
  const stages = [
    { icon: Eye, label: "Link Visits", count: data.visits, rate: null, color: "from-indigo-500 to-blue-500" },
    { icon: UserPlus, label: "Signups", count: data.signups, rate: data.conversionRate, color: "from-blue-500 to-cyan-500" },
    { icon: Share2, label: "Made Referrals", count: data.referrals, rate: data.referralRate, color: "from-cyan-500 to-teal-500" },
    { icon: Crown, label: "Paid Upgrades", count: data.upgraded, rate: data.upgradeRate, color: "from-amber-500 to-orange-500" },
  ];

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingDown className="size-5 text-indigo-400" aria-hidden />
          Conversion Funnel
        </CardTitle>
        <CardDescription>
          How visitors flow through your waitlist: visits → signups → referrals → upgrades.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          const widthPercent = Math.max((stage.count / maxCount) * 100, 5);
          return (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Icon className="size-3.5 text-muted-foreground" />
                  {stage.label}
                </span>
                <span className="tabular-nums">
                  {stage.count.toLocaleString()}
                  {stage.rate !== null && (
                    <span className="ml-1.5 text-xs text-muted-foreground">({stage.rate}%)</span>
                  )}
                </span>
              </div>
              <div className="h-8 w-full overflow-hidden rounded-md bg-muted/30">
                <motion.div
                  className={cn("flex h-full items-center justify-end rounded-md bg-gradient-to-r pr-2", stage.color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.1 }}
                >
                  <span className="text-xs font-bold text-white">
                    {stage.count.toLocaleString()}
                  </span>
                </motion.div>
              </div>
              {i < stages.length - 1 && stage.rate !== null && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <span>↓</span>
                  <span>{stage.rate}% conversion from previous stage</span>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Overall conversion */}
        <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall: Visit → Upgrade</span>
            <span className="font-bold tabular-nums text-indigo-400">
              {data.visits > 0 ? ((data.upgraded / data.visits) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
