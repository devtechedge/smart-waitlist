"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, Zap, Users, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Hero3DVisual } from "@/components/landing/hero-3d-visual";
import { AnimatedCounter } from "@/components/landing/animated-counter";

/**
 * FuturisticHero
 * --------------
 * The new landing page hero — modern, sleek, futuristic with:
 *   - Animated gradient headline
 *   - 3D floating ticket visual with orbiting referral icons
 *   - Glassmorphic signup CTA
 *   - Animated stats counter
 *   - Staggered entrance animations
 *   - "Built with" tech badges
 *
 * The children prop is the signup form (passed by the page so the page
 * can decide between SignupForm and "Go to dashboard" button).
 */
export type FuturisticHeroProps = {
  totalUsers: number | null;
  className?: string;
  children?: React.ReactNode;
};

export function FuturisticHero({ totalUsers, className, children }: FuturisticHeroProps) {
  return (
    <section className={cn("relative isolate overflow-hidden", className)}>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-2">
        {/* ── Left: Text + CTA ──────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          {/* Announcement badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 backdrop-blur-sm"
            >
              <Sparkles className="size-3.5" aria-hidden />
              {totalUsers !== null && totalUsers > 0 ? (
                <>
                  <AnimatedCounter value={totalUsers} format="compact" /> already on the waitlist
                </>
              ) : (
                "Now accepting early access signups"
              )}
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="max-w-2xl text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Skip the line.
            <br />
            <span className="gradient-text">Bring your friends.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            className="mt-6 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg md:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Get early access to the product launch everyone&apos;s talking about.
            Share your unique referral link, climb the queue, and unlock perks
            as you rise.
          </motion.p>

          {/* CTA */}
          <motion.div
            className="mt-8 flex w-full max-w-md flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {children}
          </motion.div>

          {/* Tech badges */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <span className="text-xs text-muted-foreground">Powered by</span>
            {["Next.js 16", "Supabase", "Drizzle ORM", "Stripe"].map((tech) => (
              <span
                key={tech}
                className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </motion.div>
        </div>

        {/* ── Right: 3D Visual ──────────────────────────────────────────── */}
        <motion.div
          className="flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Hero3DVisual />
        </motion.div>
      </div>
    </section>
  );
}

/** Feature bullets row — animated in on scroll. */
export function FeatureBullets() {
  const features = [
    { icon: Zap, title: "Instant signup", description: "Join the waitlist in under 30 seconds." },
    { icon: Users, title: "Viral referrals", description: "Every friend moves you up the queue." },
    { icon: Trophy, title: "Climb the ranks", description: "Top referrers get first access + perks." },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <FeatureCard {...f} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: typeof Zap; title: string; description: string }) {
  return (
    <div className="glass group relative overflow-hidden rounded-xl p-5 transition-all hover:border-indigo-500/30">
      {/* Hover glow */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 opacity-0 transition-opacity group-hover:from-indigo-500/5 group-hover:to-purple-500/5 group-hover:opacity-100" />
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

/** Re-export for the page. */
export { ArrowRight };
