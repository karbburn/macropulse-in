/**
 * MacroPulse — Mobile Detection Hook
 * Source of truth: macropulse-ANIMATIONS.md Section 8
 *
 * Used to adjust animation durations and behavior on mobile:
 * - Cap animation durations to 300ms
 * - Reduce Recharts animationDuration to 500ms (vs 800ms desktop)
 * - Cap stagger at 8 items
 */

'use client'

import { useEffect, useState } from 'react'

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return mobile
}
