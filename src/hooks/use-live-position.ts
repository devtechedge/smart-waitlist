"use client";

import * as React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * useLivePosition
 * ---------------
 * Subscribes to Supabase Realtime changes on `waitlist_entries` and
 * updates position/referral count live.
 */

export type LivePositionData = {
  position: number | null;
  referralCount: number | null;
  totalUsers: number | null;
  isLive: boolean;
  lastUpdate: Date | null;
};

export type UseLivePositionProps = {
  entryId: string;
  initialPosition: number;
  initialReferralCount: number;
  initialTotalUsers: number;
  onReferralIncrease?: (newCount: number, oldCount: number) => void;
};

export function useLivePosition({
  entryId,
  initialPosition,
  initialReferralCount,
  initialTotalUsers,
  onReferralIncrease,
}: UseLivePositionProps): LivePositionData {
  const [position] = React.useState<number | null>(initialPosition);
  const [referralCount, setReferralCount] = React.useState<number | null>(initialReferralCount);
  const [totalUsers, setTotalUsers] = React.useState<number | null>(initialTotalUsers);
  const [isLive, setIsLive] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);

  const referralRef = React.useRef(initialReferralCount);

  React.useEffect(() => {
    referralRef.current = referralCount ?? initialReferralCount;
  }, [referralCount, initialReferralCount]);

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("waitlist-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waitlist_entries" },
        (payload) => {
          setLastUpdate(new Date());

          if (payload.eventType === "UPDATE" && payload.new?.id === entryId) {
            const newData = payload.new as { referral_count: number };
            const oldCount = referralRef.current;
            const newCount = newData.referral_count;
            if (newCount > oldCount) {
              setReferralCount(newCount);
              onReferralIncrease?.(newCount, oldCount);
            }
          }

          // Re-fetch total count on any change.
          void (async () => {
            try {
              const { count } = await supabase
                .from("waitlist_entries")
                .select("*", { count: "exact", head: true });
              if (count !== null) setTotalUsers(count);
            } catch (err) {
              console.error("[useLivePosition] count failed", err);
            }
          })();
        },
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    const pollInterval = setInterval(async () => {
      try {
        const { count } = await supabase
          .from("waitlist_entries")
          .select("*", { count: "exact", head: true });
        if (count !== null) setTotalUsers(count);
      } catch {
        // silent
      }
    }, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [entryId, onReferralIncrease]);

  return { position, referralCount, totalUsers, isLive, lastUpdate };
}
