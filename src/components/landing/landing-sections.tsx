"use client";

import * as React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, UserPlus, Share2, TrendingUp, Code, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/landing/animated-counter";

/**
 * HowItWorks
 * ----------
 * 3-step "how it works" section with animated number badges + connecting line.
 * Animates in on scroll with staggered children.
 */
export function HowItWorks() {
  const steps = [
    { icon: UserPlus, title: "Join the waitlist", description: "Sign up in 30 seconds with just your email. Get an instant position in the queue." },
    { icon: Share2, title: "Share your link", description: "Grab your unique referral link and share it with friends, on socials, in group chats." },
    { icon: TrendingUp, title: "Climb the queue", description: "Every friend who signs up moves you up. Top referrers get first access + exclusive perks." },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <motion.div
        className="mb-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          How it <span className="gradient-text">works</span>
        </h2>
        <p className="mt-2 text-muted-foreground">
          Three steps to skip the line.
        </p>
      </motion.div>

      <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Connecting line (desktop) */}
        <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent md:block" />

        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            className="relative flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
          >
            {/* Number badge */}
            <div className="relative mb-4 flex size-16 items-center justify-center rounded-full border border-indigo-500/30 bg-background">
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-md" />
              <step.icon className="size-6 text-indigo-400" aria-hidden />
              <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-bold text-white">
                {i + 1}
              </span>
            </div>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/**
 * StatsBar
 * --------
 * Animated stats bar — counters animate up when scrolled into view.
 */
export function StatsBar({ totalUsers }: { totalUsers: number | null }) {
  const stats = [
    { label: "On the waitlist", value: totalUsers ?? 0, suffix: "" },
    { label: "Referrals made", value: Math.floor((totalUsers ?? 0) * 0.7), suffix: "" },
    { label: "Avg. queue jump", value: 4, suffix: " spots" },
    { label: "Launch countdown", value: 14, suffix: " days" },
  ];

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="glass grid grid-cols-2 gap-6 rounded-2xl p-8 md:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <div className="text-3xl font-bold tabular-nums gradient-text">
              {typeof stat.value === "number" && stat.value > 100 ? (
                <AnimatedCounter value={stat.value} format="comma" />
              ) : (
                stat.value
              )}
              {stat.suffix}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/**
 * FinalCTA
 * --------
 * Bottom CTA section with a big gradient button.
 */
export function FinalCTA() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-20">
      <motion.div
        className="glass relative overflow-hidden rounded-3xl p-10 text-center md:p-16"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {/* Glow */}
        <div className="absolute left-1/2 top-0 -z-10 h-40 w-96 -translate-x-1/2 rounded-full bg-indigo-500/30 blur-3xl" />

        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to <span className="gradient-text">skip the line?</span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Join thousands of others waiting for early access. The sooner you
          join, the higher you start.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild size="lg" className="group gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40">
            <Link href="/signup">
              Join the waitlist
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

/**
 * FuturisticFooter
 * ----------------
 * Footer with glow line + social links + tech credits.
 */
export function FuturisticFooter() {
  return (
    <footer className="relative mt-auto">
      {/* Top glow line */}
      <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
              W
            </div>
            <span className="text-sm font-semibold">Smart Waitlist</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/leaderboard" className="hover:text-foreground">Leaderboard</Link>
            <Link href="/signin" className="hover:text-foreground">Sign in</Link>
            <Link href="/signup" className="hover:text-foreground">Sign up</Link>
          </nav>

          {/* Socials */}
          <div className="flex items-center gap-3">
            <Link href="#" className="text-muted-foreground hover:text-foreground" aria-label="GitHub">
              <Code className="size-5" />
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground" aria-label="Twitter">
              <MessageCircle className="size-5" />
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          Built with Next.js 16 · Supabase · Drizzle ORM · shadcn/ui · Stripe
        </div>
      </div>
    </footer>
  );
}
