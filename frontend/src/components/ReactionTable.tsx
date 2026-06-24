'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EventDetail } from '../lib/types';
import { itemVariants, useSafeVariants } from '../lib/motion';

interface ReactionTableProps {
  snapshots: EventDetail['snapshots'];
}

const ASSET_ROWS = [
  { key: 'NIFTY', name: 'Nifty 50' },
  { key: 'USDINR', name: 'USD / INR' },
  { key: 'VIX', name: 'India VIX' },
  { key: 'GSEC', name: '10Y G-Sec' },
] as const;

export default function ReactionTable({ snapshots }: ReactionTableProps) {
  const reduce = useReducedMotion();
  const safeItemVariants = useSafeVariants(itemVariants);

  const renderValueCell = (pctChange: number | null) => {
    if (pctChange === null || pctChange === undefined) {
      return <span className="text-text-tertiary font-mono">—</span>;
    }

    const isPos = pctChange > 0.0001;
    const isNeg = pctChange < -0.0001;

    let colorClass = 'text-text-secondary';
    if (isPos) {
      colorClass = 'text-[var(--positive)]';
    } else if (isNeg) {
      colorClass = 'text-[var(--negative)]';
    }

    const sign = isPos ? '+' : '';
    return (
      <span className={`font-mono text-sm tabular-nums font-semibold ${colorClass}`}>
        {sign}{pctChange.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="w-full overflow-x-auto border-t border-b border-border-subtle bg-transparent">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="py-4 pr-4 font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase">
              Asset Class
            </th>
            <th className="py-4 px-4 text-right font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase">
              T−60
            </th>
            <th className="py-4 px-4 text-right font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase">
              T+30
            </th>
            <th className="py-4 px-4 text-right font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase">
              T+2H
            </th>
            <th className="py-4 pl-4 text-right font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase">
              T+1D
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle/40">
          {ASSET_ROWS.map((row, index) => {
            const snapshot = snapshots[row.key];
            
            // Stagger rows 40ms apart, starting at 600ms to align with cinematic entrance sequence
            const rowTransition = {
              duration: reduce ? 0.01 : 0.3,
              ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
              delay: reduce ? 0 : 0.6 + (index * 0.04),
            };

            return (
              <motion.tr
                key={row.key}
                variants={safeItemVariants}
                initial="hidden"
                animate="visible"
                transition={rowTransition}
                className="hover:bg-bg-elevated transition-colors group"
              >
                {/* Asset Description */}
                <td className="py-4 pr-4">
                  <span className="font-body text-sm font-semibold text-text-secondary group-hover:text-[var(--accent-primary)] transition-colors">
                    {row.name}
                  </span>
                  <span className="text-[10px] text-text-tertiary font-mono block mt-0.5">
                    {row.key}
                  </span>
                </td>

                {/* T-60 (always baseline "—") */}
                <td className="py-4 px-4 text-right">
                  <span className="text-text-tertiary font-mono text-sm">—</span>
                </td>

                {/* T+30 */}
                <td className="py-4 px-4 text-right">
                  {renderValueCell(snapshot?.['T+30']?.pct_change_from_T60 ?? null)}
                </td>

                {/* T+2H */}
                <td className="py-4 px-4 text-right">
                  {renderValueCell(snapshot?.['T+2H']?.pct_change_from_T60 ?? null)}
                </td>

                {/* T+1D */}
                <td className="py-4 pl-4 text-right">
                  {renderValueCell(snapshot?.['T+1D']?.pct_change_from_T60 ?? null)}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
