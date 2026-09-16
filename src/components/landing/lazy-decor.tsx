"use client";

import dynamic from "next/dynamic";

/**
 * Decorative landing chrome, split out of the initial bundle.
 *
 * The background and the 3D hero are pure visual polish: they sit behind or
 * beside the content and nothing above the fold depends on them. Loading them
 * eagerly pulled the animation runtime into the first-paint chunk on a route
 * that is already rendered dynamically per request.
 *
 * `ssr: false` is only legal inside a Client Component, which is why these
 * wrappers live in their own file rather than directly in the page.
 */

export const LazyFuturisticBackground = dynamic(
  () => import("./futuristic-background").then((m) => m.FuturisticBackground),
  { ssr: false },
);

export const LazyHero3DVisual = dynamic(
  () => import("./hero-3d-visual").then((m) => m.Hero3DVisual),
  { ssr: false },
);
