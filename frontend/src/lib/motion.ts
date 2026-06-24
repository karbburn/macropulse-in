/**
 * MacroPulse — Framer Motion Variants & Hooks
 * Source of truth: macropulse-ANIMATIONS.md Sections 3.1, 3.2, 5.4
 */

import { Variants, useReducedMotion } from 'framer-motion'

/* ================================================================
   Shared Variants (ANIMATIONS.MD §3.1)
   ================================================================ */

/** Page-level entrance — content slides up and fades in */
export const pageVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.06,
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
  }
}

/** Individual item in a staggered list */
export const itemVariants: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

/** Fade only — for overlays, tooltips, badges */
export const fadeVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } }
}

/** Slide in from left — for detail page header */
export const slideRightVariants: Variants = {
  hidden:  { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

/** Scale reveal — for metric chips, score badges */
export const scaleVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: [0.34, 1.10, 0.64, 1.00] }
  }
}

/** Chart container reveal */
export const chartVariants: Variants = {
  hidden:  { opacity: 0, scaleY: 0.96, originY: 1 },
  visible: {
    opacity: 1,
    scaleY: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }
  }
}

/** Number count-up — used with useCountUp hook */
export const numberRevealVariants: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

/* ================================================================
   Reaction Metric Chips (ANIMATIONS.MD §5.4)
   ================================================================ */

/** Container for the 4-chip row — staggers children */
export const chipContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.18 }
  }
}

/** Individual metric chip */
export const chipVariants: Variants = {
  hidden:  { opacity: 0, y: 10, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.25, ease: [0.34, 1.10, 0.64, 1.00] }
  }
}

/* ================================================================
   Reduced Motion Hook (ANIMATIONS.MD §3.2)
   ================================================================ */

/** Returns safe variants that respect prefers-reduced-motion */
export function useSafeVariants(variants: Variants): Variants {
  const reduce = useReducedMotion()
  if (!reduce) return variants

  /* Strip all transforms, keep only opacity transitions */
  return Object.fromEntries(
    Object.entries(variants).map(([key, val]) => [
      key,
      {
        opacity: (val as any)?.opacity ?? 1,
        transition: { duration: 0.01 }
      }
    ])
  ) as Variants
}
