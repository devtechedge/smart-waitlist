"use server";

import { getAdminEntries, requireAdmin, type AdminWaitlistRow } from "@/lib/queries/admin";

/**
 * Admin Server Actions
 * --------------------
 * Wraps admin read queries with auth enforcement (`requireAdmin()` throws
 * if the caller isn't on the `ADMIN_EMAILS` allow-list).
 *
 * The CSV export returns a plain string so the client can trigger a
 * download via a Blob — keeping the binary file generation client-side
 * avoids Server Action streaming limits and lets the browser handle the
 * download UI natively.
 */

export type AdminActionState = {
  ok: false;
  error: string;
};

/** Shape returned by `exportWaitlistCsvAction` on success. */
export type CsvExport = {
  filename: string;
  contentType: "text/csv;charset=utf-8";
  csv: string;
  rowCount: number;
};

/** Server-side query — wraps `getAdminEntries` with admin enforcement. */
export async function listAllEntriesAction(
  limit = 1000,
  offset = 0,
): Promise<AdminWaitlistRow[]> {
  return getAdminEntries(limit, offset);
}

/** Convenience: fetch summary stats for the admin dashboard header. */
export async function getAdminStatsAction() {
  const { getAdminStats } = await import("@/lib/queries/admin");
  return getAdminStats();
}

/**
 * Export the full waitlist as CSV. Returns the CSV as a string so the
 * client can create a Blob and trigger a download — this avoids the
 * Server Action body-size limit on Vercel and keeps the binary file
 * generation client-side.
 *
 * CSV format (RFC 4180 compliant):
 *   Position,Email,FullName,ReferralCode,ReferralCount,Visits,Status,CreatedAt,UserId,ReferredByEntryId
 *
 * - Fields containing commas, quotes, or newlines are double-quoted.
 * - Embedded double quotes are escaped by doubling (`"` → `""`).
 * - Timestamps are ISO 8601 (UTC) — sortable and Excel-friendly.
 * - NULL fields are emitted as empty strings (not "null").
 */
export async function exportWaitlistCsvAction(): Promise<
  | (CsvExport & { ok: true })
  | AdminActionState
> {
  try {
    await requireAdmin();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unauthorized.";
    return { ok: false, error: message };
  }

  const rows = await getAdminEntries(10_000, 0);

  const headers = [
    "Position",
    "Email",
    "FullName",
    "ReferralCode",
    "ReferralCount",
    "Visits",
    "Status",
    "CreatedAt",
    "UserId",
    "ReferredByEntryId",
  ] as const;

  const headerLine = headers.join(",");

  const bodyLines = rows.map((row) =>
    [
      row.position,
      row.email,
      row.fullName ?? "",
      row.referralCode,
      row.referralCount,
      row.visits,
      row.status,
      row.createdAt.toISOString(),
      row.userId ?? "",
      row.referredByEntryId ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );

  // Prepend a UTF-8 BOM so Excel detects encoding correctly.
  const csv = `\uFEFF${headerLine}\n${bodyLines.join("\n")}`;

  const today = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    filename: `waitlist-${today}.csv`,
    contentType: "text/csv;charset=utf-8",
    csv,
    rowCount: rows.length,
  };
}

/**
 * RFC 4180 CSV field escaper. Wraps the field in double quotes if it
 * contains any of: comma, double quote, newline, or carriage return.
 * Embedded double quotes are doubled.
 */
function escapeCsv(value: string | number): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
