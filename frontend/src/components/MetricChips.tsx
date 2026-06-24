'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { EventDetail } from '../lib/types';
import { chipContainerVariants, chipVariants, useSafeVariants } from '../lib/motion';

interface MetricChipsProps {
  snapshots: EventDetail['snapshots'];
}

const ASSET_METADATA = {
  NIFTY: { label: 'NIFTY 50' },
  USDINR: { label: 'USD / INR' },
  VIX: { label: 'INDIA VIX' },
  GSEC: { label: '10Y G-SEC' },
} as const;

export default function MetricChips({ snapshots }: MetricChipsProps) {
  const safeContainer = useSafeVariants(chipContainerVariants);
  const safeChip = useSafeVariants(chipVariants);

  const assets = ['NIFTY', 'USDINR', 'VIX', 'GSEC'] as const;

  return (
    <motion.div
      variants={safeContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full"
    >
      {assets.map((assetKey) => {
        const metadata = ASSET_METADATA[assetKey];
        const snapshot = snapshots[assetKey];
        const t1dData = snapshot?.['T+1D'];
        
        let pctChange = t1dData?.pct_change_from_T60 ?? null;

        // Determine formatting and color coding
        let pctColorClass = 'text-text-secondary';
        let formattedValue = '-';


        if (pctChange !== null && pctChange !== undefined) {
          // Convert fraction to percentage if it's not already in percentage form
          // Note: In the existing database/types, pct_change_from_T60 is already formatted as percentage (e.g. 0.34 for 0.34%)
          // Let's format it to 2 decimal places.
          const isPos = pctChange > 0.0001;
          const isNeg = pctChange < -0.0001;
          
          if (isPos) {
            pctColorClass = 'text-[var(--positive)]';
            formattedValue = `+${pctChange.toFixed(2)}%`;
          } else if (isNeg) {
            pctColorClass = 'text-[var(--negative)]';
            formattedValue = `${pctChange.toFixed(2)}%`;
          } else {
            pctColorClass = 'text-text-secondary';
            formattedValue = '0.00%';
          }
        }

        return (
          <motion.div
            key={assetKey}
            variants={safeChip}
            className="rounded-[4px] border border-border-subtle bg-bg-surface p-4 flex flex-col justify-between h-[90px] transition-colors hover:bg-bg-elevated"
          >
            {/* Asset Name */}
            <span className="font-body text-xs font-semibold tracking-wider text-text-secondary uppercase">
              {metadata.label}
            </span>

            {/* % Value */}
            <span className={`font-mono text-xl font-bold tracking-tight tabular-nums leading-none my-1 ${pctColorClass}`}>
              {formattedValue}
            </span>

            {/* vs T-60 label */}
            <span className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">
              vs T-60 baseline
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
