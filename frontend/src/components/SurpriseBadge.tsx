'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { scaleVariants, useSafeVariants } from '../lib/motion';

interface SurpriseBadgeProps {
  score: number | null;
}

export default function SurpriseBadge({ score }: SurpriseBadgeProps) {
  const safeScaleVariants = useSafeVariants(scaleVariants);

  if (score === null || score === undefined) {
    return (
      <motion.span
        variants={safeScaleVariants}
        initial="hidden"
        animate="visible"
        className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-border-strong bg-bg-surface px-2.5 py-1 text-xs text-text-tertiary font-mono"
      >
        -

      </motion.span>
    );
  }

  const absScore = Math.abs(score);
  const formattedScore = `${absScore.toFixed(1)}σ`;
  const isPositive = score > 0;
  const symbol = isPositive ? '▲' : '▼';

  let badgeStyles = '';

  if (absScore < 0.5) {
    // Low surprise: green
    badgeStyles = 'border-[var(--surprise-low)] bg-[var(--positive-dim)] text-[var(--surprise-low)]';
  } else if (absScore <= 1.5) {
    // Mild surprise: brass
    badgeStyles = 'border-[var(--surprise-mid)] bg-[rgba(196,154,60,0.15)] text-[var(--surprise-mid)]';
  } else {
    // Large surprise: red
    badgeStyles = 'border-[var(--surprise-high)] bg-[var(--negative-dim)] text-[var(--surprise-high)]';
  }

  return (
    <motion.span
      variants={safeScaleVariants}
      initial="hidden"
      animate="visible"
      className={`inline-flex items-center gap-1 rounded-full border-[1.5px] px-2.5 py-1 text-xs font-mono ${badgeStyles}`}
    >
      {symbol} {formattedScore}
    </motion.span>
  );
}
