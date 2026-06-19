"use client";

import * as React from "react";
import { motion } from "motion/react";
import { MapPin, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * GeoHeatmap
 * ----------
 * A simplified "heatmap" showing top countries/cities by signup count.
 * Uses horizontal bars with intensity-based coloring (no world map SVG
 * to keep the bundle small — a full map can be added with react-simple-maps
 * if needed).
 *
 * Props:
 *   - data: from `getGeoSignupData()`
 */
export type GeoDataPoint = {
  country: string | null;
  city: string | null;
  count: number;
};

export type GeoHeatmapProps = {
  data: GeoDataPoint[];
  className?: string;
};

export function GeoHeatmap({ data, className }: GeoHeatmapProps) {
  // Aggregate by country
  const countryData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const point of data) {
      const key = point.country ?? "Unknown";
      map.set(key, (map.get(key) ?? 0) + point.count);
    }
    return Array.from(map.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  const maxCount = Math.max(...countryData.map((c) => c.count), 1);
  const totalSignups = countryData.reduce((sum, c) => sum + c.count, 0);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="size-5 text-indigo-400" aria-hidden />
          Signup Geography
        </CardTitle>
        <CardDescription>
          Where your waitlist signups are coming from ({totalSignups.toLocaleString()} total).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {countryData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No geo data yet — signups will appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {countryData.map((country, i) => {
              const intensity = country.count / maxCount;
              const hue = 220 + intensity * 40; // blue to purple range
              return (
                <motion.div
                  key={country.country}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex w-28 items-center gap-1.5 text-sm">
                    <MapPin className="size-3 text-muted-foreground" />
                    <span className="truncate">{country.country}</span>
                  </div>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted/30">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-md"
                      style={{
                        background: `linear-gradient(90deg, hsl(${hue}, 70%, 60%), hsl(${hue + 20}, 70%, 50%))`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(intensity * 100, 2)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold tabular-nums text-foreground">
                      {country.count}
                    </span>
                  </div>
                  <span className="w-12 text-right text-xs text-muted-foreground">
                    {Math.round((country.count / totalSignups) * 100)}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
