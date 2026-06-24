/**
 * MacroPulse — Number Count-Up Animation Hook
 * Source of truth: macropulse-ANIMATIONS.md Section 5.5
 *
 * Animates a number from 0 to target over `duration` ms.
 * Respects prefers-reduced-motion: returns target immediately.
 */

'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

export function useCountUp(target: number, duration = 600): number {
  const reduce = useReducedMotion()
  const [value, setValue] = useState(reduce ? target : 0)

  useEffect(() => {
    if (reduce) { setValue(target); return }

    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      /* ease-out cubic */
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(parseFloat((eased * target).toFixed(2)))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration, reduce])

  return value
}
