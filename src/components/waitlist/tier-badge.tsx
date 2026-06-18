import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown, Rocket } from "lucide-react";

/**
 * TierBadge
 * ---------
 * Small colored badge showing the user's early-access tier.
 *   free     → gray
 *   pro      → blue
 *   founder  → gold/amber
 */
export type TierBadgeProps = {
  tier: "free" | "pro" | "founder";
  className?: string;
  /** Show the tier name + icon, or just the icon. */
  iconOnly?: boolean;
};

export function TierBadge({ tier, className, iconOnly = false }: TierBadgeProps) {
  const config = {
    free: {
      label: "Free",
      icon: Rocket,
      className: "bg-muted text-muted-foreground hover:bg-muted",
    },
    pro: {
      label: "Pro",
      icon: Sparkles,
      className: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-300 border-transparent",
    },
    founder: {
      label: "Founder",
      icon: Crown,
      className: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 border-transparent",
    },
  }[tier];

  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={cn("gap-1", config.className, className)}>
      <Icon className="size-3" aria-hidden />
      {!iconOnly && <span>{config.label}</span>}
    </Badge>
  );
}
