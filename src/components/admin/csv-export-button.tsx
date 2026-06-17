"use client";

import * as React from "react";
import { useTransition } from "react";
import { Download, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { exportWaitlistCsvAction } from "@/app/actions/admin";

/**
 * CsvExportButton
 * ---------------
 * Client component. Triggers the `exportWaitlistCsvAction` Server Action,
 * receives the CSV as a string, and initiates a browser download via a
 * Blob URL.
 *
 * Why client-side Blob creation:
 *   - Avoids Server Action body-size limits on Vercel (4MB default).
 *   - Lets the browser handle the download UI natively (progress, save dialog).
 *   - The Server Action returns `{ csv, filename, contentType, rowCount }`.
 *
 * Props:
 *   - `variant`, `size` : standard Button props.
 *   - `className`       : extra classes.
 *   - `label`           : button text (default "Export CSV").
 *   - `disabled`        : external disable (e.g. when table is empty).
 */
export type CsvExportButtonProps = {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  label?: string;
  disabled?: boolean;
};

export function CsvExportButton({
  variant = "outline",
  size = "sm",
  className,
  label = "Export CSV",
  disabled = false,
}: CsvExportButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = React.useCallback(() => {
    startTransition(async () => {
      const result = await exportWaitlistCsvAction();

      if (!result.ok) {
        toast.error(result.error ?? "Export failed.");
        return;
      }

      try {
        // Create a Blob from the CSV string and trigger a download.
        const blob = new Blob([result.csv], { type: result.contentType });
        const url = URL.createObjectURL(blob);

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = result.filename;
        anchor.rel = "noopener";
        // Append to DOM so Firefox triggers the download.
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        // Revoke the URL after a short delay to ensure the download started.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);

        toast.success(`Exported ${result.rowCount.toLocaleString()} rows.`);
      } catch (err) {
        console.error("[CsvExportButton] download failed", err);
        toast.error("Couldn't start the download. Please try again.");
      }
    });
  }, []);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-1.5", className)}
      onClick={handleClick}
      disabled={disabled || isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Exporting…
        </>
      ) : (
        <>
          <Download className="size-4" aria-hidden />
          {label}
        </>
      )}
    </Button>
  );
}

/** Re-export for convenience if the parent wants a different icon. */
export { FileDown };
