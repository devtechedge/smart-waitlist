"use client";

import * as React from "react";
import { motion } from "motion/react";

/**
 * FuturisticBackground
 * --------------------
 * Multi-layer animated background:
 *   1. Animated gradient blobs (indigo/purple/pink)
 *   2. Grid pattern overlay
 *   3. Floating particles
 *   4. Scan line (sci-fi vibe)
 *   5. Vignette (focus to center)
 *
 * Pure CSS/SVG — no images, no WebGL. Performant on mobile.
 * Fixed position, z-index -10, pointer-events none.
 */
export function FuturisticBackground() {
  // Generate stable random particles once on mount.
  // Using useState with a lazy initializer (not useMemo) because Math.random
  // is impure — React 19's react-hooks/purity rule flags it in useMemo.
  const [particles] = React.useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
    })),
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Layer 1: Animated gradient blobs */}
      <motion.div
        className="absolute -left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[120px]"
        animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-purple-500/20 blur-[100px]"
        animate={{ x: [0, -80, 0], y: [0, 60, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-[450px] w-[450px] rounded-full bg-pink-500/15 blur-[110px]"
        animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Layer 2: Grid pattern */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* Layer 3: Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-400/40"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -30, 0], opacity: [0, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Layer 4: Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Layer 5: Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 80%)" }}
      />
    </div>
  );
}
