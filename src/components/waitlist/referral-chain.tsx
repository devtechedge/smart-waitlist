"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Users, GitBranch } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "@/components/waitlist/tier-badge";

/**
 * ReferralChain
 * -------------
 * Visualizes the user's referral chain as a tree. Each node shows the
 * person's name, referral count, and tier. Lines connect parents to children.
 *
 * The tree renders recursively, with each level indented. Animations stagger
 * on load for a premium feel.
 *
 * Props:
 *   - root: the root node (current user) from `getReferralChain()`
 */
export type ReferralNode = {
  id: string;
  email: string;
  fullName: string | null;
  referralCode: string;
  referralCount: number;
  tier: string;
  depth: number;
  children: ReferralNode[];
};

export type ReferralChainProps = {
  root: ReferralNode | null;
  className?: string;
};

export function ReferralChain({ root, className }: ReferralChainProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitBranch className="size-5 text-indigo-400" aria-hidden />
          Your Referral Chain
        </CardTitle>
        <CardDescription>
          Everyone who signed up using your link (and their referrals) — up to 3 levels deep.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!root ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No referrals yet — share your link to grow your chain!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TreeNode node={root} isRoot />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TreeNode({ node, isRoot = false }: { node: ReferralNode; isRoot?: boolean }) {
  const displayName = node.fullName ?? maskEmail(node.email);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: node.depth * 0.1 }}
    >
      {/* Node */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-3 transition-colors",
          isRoot
            ? "border-indigo-500/40 bg-indigo-500/5"
            : "border-border hover:border-indigo-500/20 hover:bg-muted/30",
          node.depth > 0 && "ml-8",
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            isRoot
              ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"
              : "bg-muted text-muted-foreground",
          )}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{displayName}</span>
            {node.tier !== "free" && (
              <TierBadge tier={node.tier as "free" | "pro" | "founder"} iconOnly className="shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3" />
            <span>{node.referralCount} referrals</span>
            <span>·</span>
            <code className="font-mono">{node.referralCode}</code>
          </div>
        </div>

        {isRoot && (
          <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
            You
          </span>
        )}
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="relative mt-2 space-y-2 border-l border-indigo-500/20 pl-4 ml-4">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}•••@${domain}`;
}
