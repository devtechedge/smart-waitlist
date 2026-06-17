import * as React from "react";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminWaitlistRow } from "@/lib/queries/admin";

/**
 * WaitlistTable
 * -------------
 * Server Component. Renders the full admin waitlist table with columns:
 *   # | Email | Name | Code | Referrals | Visits | Status | Joined
 *
 * Position is computed at query time (see `getAdminEntries`) and passed
 * through. The table is wrapped in a Card for consistent admin styling.
 *
 * Props:
 *   - `entries`   : the rows from `getAdminEntries()`.
 *   - `className` : optional extra classes.
 */
export type WaitlistTableProps = {
  entries: AdminWaitlistRow[];
  className?: string;
};

export function WaitlistTable({ entries, className }: WaitlistTableProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="text-xl">All waitlist entries</CardTitle>
        <CardDescription>
          {entries.length === 0
            ? "No entries yet — the waitlist is empty."
            : `Showing ${entries.length.toLocaleString()} ${entries.length === 1 ? "entry" : "entries"}, ranked by referrals.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-16 pl-4 text-center">#</TableHead>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead className="min-w-[140px]">Name</TableHead>
                <TableHead className="w-28">Code</TableHead>
                <TableHead className="w-24 text-right">Referrals</TableHead>
                <TableHead className="w-20 text-right">Visits</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-44 pr-4 text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    No waitlist entries to display.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    {/* Position */}
                    <TableCell className="pl-4 text-center font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                      {entry.position}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="font-medium">
                      <span className="block truncate" title={entry.email}>
                        {entry.email}
                      </span>
                      {entry.userId ? null : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                          unclaimed
                        </span>
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell className="text-muted-foreground">
                      {entry.fullName ?? (
                        <span className="italic text-muted-foreground/60">—</span>
                      )}
                    </TableCell>

                    {/* Referral code */}
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {entry.referralCode}
                      </code>
                    </TableCell>

                    {/* Referral count */}
                    <TableCell className="text-right font-semibold tabular-nums">
                      {entry.referralCount.toLocaleString()}
                    </TableCell>

                    {/* Visits */}
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {entry.visits.toLocaleString()}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={entry.status} />
                    </TableCell>

                    {/* Joined */}
                    <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Internal: status badge with color per status. */
function StatusBadge({
  status,
}: {
  status: AdminWaitlistRow["status"];
}) {
  const label =
    status === "pending"
      ? "Pending"
      : status === "invited"
        ? "Invited"
        : "Activated";

  const variant =
    status === "pending"
      ? "secondary"
      : status === "invited"
        ? "default"
        : "outline";

  const className =
    status === "pending"
      ? "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
      : status === "invited"
        ? "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-300"
        : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300";

  return (
    <Badge variant={variant} className={cn("border-transparent", className)}>
      {label}
    </Badge>
  );
}
