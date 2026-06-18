"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminAnalytics } from "@/lib/queries/admin";
import { maskEmail } from "@/lib/format";

/**
 * AnalyticsCharts
 * ---------------
 * Client component rendering 4 charts on the admin dashboard:
 *   1. Signups over time (area chart, 30 days)
 *   2. Top referrers (horizontal bar chart)
 *   3. Tier distribution (donut chart)
 *   4. Status distribution (donut chart)
 *
 * Data is fetched server-side by the admin page and passed in as props.
 * This component is `"use client"` because recharts needs the browser.
 */
export type AnalyticsChartsProps = {
  data: AdminAnalytics;
  className?: string;
};

const TIER_COLORS: Record<string, string> = {
  free: "hsl(var(--chart-1))",
  pro: "hsl(var(--chart-2))",
  founder: "hsl(var(--chart-3))",
};

const signupChartConfig = {
  signups: { label: "Signups", color: "hsl(var(--chart-1))" },
  referrals: { label: "Via referral", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const referrerChartConfig = {
  referralCount: { label: "Referrals", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const tierChartConfig = {
  count: { label: "Users", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export function AnalyticsCharts({ data, className }: AnalyticsChartsProps) {
  // Format dates for the X axis (e.g. "Jun 5")
  const signupData = data.dailySignups.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  // Top referrers: use masked email if no name
  const referrerData = data.topReferrers.map((r) => ({
    name: r.fullName ?? maskEmail(r.email),
    referralCount: r.referralCount,
  }));

  return (
    <div className={className}>
      {/* Row 1: Signups over time (full width) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Signups over the last 30 days</CardTitle>
          <CardDescription>
            Daily new waitlist signups, split by whether they came via a referral.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signupData.every((d) => d.signups === 0) ? (
            <EmptyChart />
          ) : (
            <ChartContainer config={signupChartConfig} className="h-[280px] w-full">
              <AreaChart data={signupData} margin={{ left: 12, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillReferrals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  minTickGap={32}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  allowDecimals={false}
                  width={32}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="signups"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#fillSignups)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="referrals"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#fillReferrals)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Row 2: Top referrers + Tier/Status donuts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top referrers (spans 2 cols on desktop) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Top referrers</CardTitle>
            <CardDescription>The 10 users bringing in the most signups.</CardDescription>
          </CardHeader>
          <CardContent>
            {referrerData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ChartContainer config={referrerChartConfig} className="h-[280px] w-full">
                <BarChart
                  data={referrerData}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="referralCount"
                    fill="hsl(var(--chart-1))"
                    radius={4}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Tier distribution donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tier distribution</CardTitle>
            <CardDescription>Free vs Pro vs Founder.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.tierDistribution.every((t) => t.count === 0) ? (
              <EmptyChart />
            ) : (
              <ChartContainer config={tierChartConfig} className="mx-auto h-[280px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="tier" />} />
                  <Pie
                    data={data.tierDistribution}
                    dataKey="count"
                    nameKey="tier"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.tierDistribution.map((entry) => (
                      <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] ?? "hsl(var(--chart-1))"} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <Legend
              items={data.tierDistribution.map((t) => ({
                label: t.tier,
                value: t.count,
                color: TIER_COLORS[t.tier] ?? "hsl(var(--chart-1))",
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Internal: small legend list below donut charts. */
function Legend({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="capitalize text-muted-foreground">{item.label}</span>
          <span className="font-semibold tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Internal: empty state placeholder. */
function EmptyChart() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      No data yet — charts will populate as users sign up.
    </div>
  );
}
