/**
 * RFC 4180 CSV field escaper.
 * Wraps the field in double quotes if it contains comma, quote, or newline.
 * Embedded double quotes are doubled.
 */
export function escapeCsv(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map(escapeCsv).join(",");
}
