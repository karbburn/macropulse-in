'use client'

/**
 * MacroPulse — Page Wrapper with entrance animation
 * Source of truth: macropulse-ANIMATIONS.md §4.2
 *
 * Wraps every page's root element. Content slides up 16px and fades in
 * over 350ms. Exits by sliding up 8px. Feels like turning a page.
 */

import { motion } from 'framer-motion'
import { pageVariants, useSafeVariants } from '@/lib/motion'

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const variants = useSafeVariants(pageVariants)
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}
