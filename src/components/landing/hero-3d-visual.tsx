"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Users, ArrowUp, Zap } from "lucide-react";

/**
 * Hero3DVisual
 * ------------
 * A 3D animated visual for the hero section — a floating glassmorphic
 * "ticket" card showing a live queue position, with orbiting referral
 * icons. Uses CSS 3D transforms + framer-motion for smooth animation.
 *
 * The visual tells the story: "you're in a queue, referrals move you up."
 *
 * Structure:
 *   - Central 3D ticket (position card) that floats + tilts
 *   - Orbiting referral dots (representing your friends joining)
 *   - Up-arrow that pulses (you're climbing)
 *   - Glow underneath
 */
export function Hero3DVisual() {
  return (
    <div className="perspective-1000 relative flex items-center justify-center">
      {/* Glow underneath */}
      <div className="absolute bottom-0 h-32 w-64 rounded-full bg-indigo-500/30 blur-3xl" />

      {/* Orbiting dots container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative size-[340px]">
          {/* Orbit ring 1 */}
          <motion.div
            className="absolute inset-0 rounded-full border border-indigo-500/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <div className="flex size-8 items-center justify-center rounded-full bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/40">
                <Users className="size-4 text-indigo-300" />
              </div>
            </div>
          </motion.div>

          {/* Orbit ring 2 (reverse) */}
          <motion.div
            className="absolute inset-8 rounded-full border border-purple-500/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex size-6 items-center justify-center rounded-full bg-purple-500/20 backdrop-blur-sm border border-purple-400/40">
                <Zap className="size-3 text-purple-300" />
              </div>
            </div>
            <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2">
              <div className="flex size-6 items-center justify-center rounded-full bg-pink-500/20 backdrop-blur-sm border border-pink-400/40">
                <Users className="size-3 text-pink-300" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Central 3D ticket card */}
      <motion.div
        className="glass relative z-10 w-64 rounded-2xl p-5 shadow-2xl"
        style={{ transformStyle: "preserve-3d" }}
        animate={{
          y: [0, -12, 0],
          rotateX: [8, 12, 8],
          rotateY: [-8, -4, -8],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Top row: label + live dot */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300/70">
            Your Position
          </span>
          <div className="flex items-center gap-1">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </span>
            <span className="text-[9px] font-medium text-green-400">LIVE</span>
          </div>
        </div>

        {/* Position number */}
        <div className="flex items-end gap-2">
          <motion.span
            className="gradient-text text-5xl font-bold tabular-nums"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            #1
          </motion.span>
          <span className="mb-1 text-xs text-muted-foreground">of 2,431</span>
        </div>

        {/* Up arrow + movement */}
        <div className="mt-3 flex items-center gap-1.5">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowUp className="size-3.5 text-green-400" />
          </motion.div>
          <span className="text-xs font-medium text-green-400">+5 spots today</span>
        </div>

        {/* Divider */}
        <div className="my-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Referral count */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Referrals
          </span>
          <div className="flex items-center gap-1">
            {["bg-indigo-400", "bg-purple-400", "bg-pink-400"].map((c, i) => (
              <motion.div
                key={c}
                className={`size-2 rounded-full ${c}`}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
            <span className="ml-1 text-xs font-bold">7</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted/50">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            animate={{ width: ["0%", "85%", "0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
