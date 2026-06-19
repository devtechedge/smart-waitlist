"use client";

import * as React from "react";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * PositionHistoryChart
 * --------------------
 * Line/area chart showing the user's waitlist position over time.
 * Lower = better (closer to #1). The Y-axis is inverted so "up" = better.
 *
 * Props:
 *   - data: from `getPositionHistory()` — array of { position, referralCount, recordedAt }
 */
export type PositionHistoryPoint = {
  position: number;
  referralCount: number;
  tier: string;
  recordedAt: Date;
};

export type PositionHistoryChartProps = {
  data: PositionHistoryPoint[];
  className?: string;
};

const chartConfig = {
  position: { label: "Position", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export function PositionHistoryChart({ data, className }: PositionHistoryChartProps) {
  const chartData = React.useMemo(
    () =>
      data.map((point) => ({
        label: new Date(point.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        position: point.position,
        referralCount: point.referralCount,
      })),
    [data],
  );

  const bestPosition = data.length > 0 ? Math.min(...data.map((d) => d.position)) : null;
  const latestPosition = data.length > 0 ? data[data.length - 1]?.position : null;
  const firstPosition = data.length > 0 ? data[0]?.position : null;
  const improvement = firstPosition && latestPosition ? firstPosition - latestPosition : 0;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <TrendingDown className="size-5 text-green-500" aria-hidden />
            Position History
          </span>
          {improvement > 0 && (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
              ↑ {improvement} spots
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Your queue position over the last 30 days. Lower is better.
          {bestPosition && ` Best: #${bestPosition}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length < 2 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Not enough data yet — your position history will appear here over time.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <AreaChart data={chartData} margin={{ left: 12, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="fillPosition" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                reversed  // Lower position = higher on chart (better)
                width={32}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="position"
                stroke="hsl(var(--chart-1))"
                fill="url(#fillPosition)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
