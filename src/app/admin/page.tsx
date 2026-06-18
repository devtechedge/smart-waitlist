import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { DashboardNav } from "@/components/waitlist/dashboard-nav";
import { StatsCards } from "@/components/admin/stats-cards";
import { WaitlistTable } from "@/components/admin/waitlist-table";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminStats, getAdminEntries, getAdminAnalytics, AdminAuthError } from "@/lib/queries/admin";
import { getCurrentUser } from "@/lib/queries/waitlist";
import { isAdminEmail } from "@/lib/server-env";

export const metadata: Metadata = {
  title: "Admin",
  description: "Waitlist admin dashboard — view entries and export CSV.",
  robots: { index: false, follow: false },
};

// Admin page — never cache, never prerender (needs server env + DB at runtime).
export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // 1. Require an authenticated user.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/?redirect=/admin");
  }

  // 2. Require the user to be on the ADMIN_EMAILS allow-list.
  //    We check here (in addition to inside the query functions) so we can
  //    show a friendly "forbidden" screen instead of an error boundary.
  if (!isAdminEmail(user.email)) {
    return (
      <>
        <DashboardNav userEmail={user.email} active="admin" />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md border-destructive/30">
            <CardHeader className="items-center text-center">
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldAlert className="size-6" aria-hidden />
              </div>
              <CardTitle className="text-xl">Access denied</CardTitle>
              <CardDescription>
                You don&apos;t have permission to view this page. If you
                believe this is a mistake, contact the project owner.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <p className="text-xs text-muted-foreground">
                Signed in as {user.email}
              </p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  // 3. Fetch stats + entries. Both are admin-gated server-side too.
  let stats;
  let entries;
  let analytics;
  try {
    [stats, entries, analytics] = await Promise.all([
      getAdminStats(),
      getAdminEntries(1000, 0),
      getAdminAnalytics().catch(() => null), // non-fatal — charts just won't render
    ]);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      redirect("/?redirect=/admin");
    }
    throw err;
  }

  const hasEntries = entries.length > 0;

  return (
    <>
      <DashboardNav userEmail={user.email} showAdmin active="admin" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {/* Header row */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Admin dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage the waitlist, view referral metrics, and export data.
            </p>
          </div>
          <CsvExportButton
            disabled={!hasEntries}
            label="Export CSV"
            variant="default"
          />
        </div>

        {/* Stats grid */}
        <StatsCards stats={stats} className="mb-8" />

        {/* Analytics charts */}
        {analytics ? (
          <AnalyticsCharts data={analytics} className="mb-8" />
        ) : null}

        {/* Full table */}
        <WaitlistTable entries={entries} />
      </main>
    </>
  );
}
