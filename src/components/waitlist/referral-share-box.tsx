"use client";

import * as React from "react";
import { Check, Copy, Link2, Share2, MessageCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * ReferralShareBox
 * ----------------
 * Client component. Displays the user's unique referral link with a
 * one-click copy button + social share buttons (Twitter/X, LinkedIn, native
 * Web Share API on mobile).
 *
 * The link is computed server-side and passed in as a prop — this component
 * is purely presentational + clipboard/share.
 *
 * Props:
 *   - `referralLink`  : the full absolute URL, e.g. https://app.com/?ref=k3f9a2
 *   - `referralCount` : how many people have already used this link (for the
 *                       "X friends joined" line).
 *   - `referralCode`  : the short code, shown as a chip.
 */
export type ReferralShareBoxProps = {
  referralLink: string;
  referralCount: number;
  referralCode: string;
  className?: string;
};

export function ReferralShareBox({
  referralLink,
  referralCount,
  referralCode,
  className,
}: ReferralShareBoxProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      // Reset the icon after 2s.
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — long-press the link to copy manually.");
    }
  }, [referralLink]);

  const handleNativeShare = React.useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      toast.message("Native share isn't available — use the copy button instead.");
      return;
    }
    try {
      await navigator.share({
        title: "Join me on the waitlist",
        text: "I'm on the waitlist — use my link to skip the line:",
        url: referralLink,
      });
    } catch {
      // User cancelled — no toast needed.
    }
  }, [referralLink]);

  const tweetUrl = React.useMemo(() => {
    const text = encodeURIComponent(
      "Just joined the waitlist — use my link to skip the line and get early access 👇",
    );
    const url = encodeURIComponent(referralLink);
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }, [referralLink]);

  const linkedinUrl = React.useMemo(() => {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
  }, [referralLink]);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Link2 className="size-5" aria-hidden />
          Your referral link
        </CardTitle>
        <CardDescription>
          Share this link with friends. Every signup moves you up the queue.
          {referralCount > 0 ? (
            <span className="mt-1 block font-medium text-foreground">
              {referralCount} {referralCount === 1 ? "friend has" : "friends have"} joined so far 🎉
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Link + copy */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Input
              readOnly
              value={referralLink}
              className="pr-24 font-mono text-sm"
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Your referral link"
            />
            <Button
              type="button"
              size="sm"
              variant={copied ? "default" : "secondary"}
              className="absolute right-1 top-1/2 -translate-y-1/2 gap-1.5"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="size-3.5" aria-hidden />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Referral code chip */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Referral code:</span>
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
            {referralCode}
          </code>
        </div>

        {/* Social share buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Share2 className="size-3.5" aria-hidden />
            Share:
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(tweetUrl, "_blank", "noopener,noreferrer")}
          >
            <MessageCircle className="size-3.5" aria-hidden />
            Post on X
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(linkedinUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="size-3.5" aria-hidden />
            LinkedIn
          </Button>

          {typeof navigator !== "undefined" && "share" in navigator ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleNativeShare}
            >
              <Share2 className="size-3.5" aria-hidden />
              More…
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
