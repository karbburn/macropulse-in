'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MacroEvent } from '../lib/types';
import SurpriseBadge from './SurpriseBadge';
import { slideRightVariants, useSafeVariants } from '../lib/motion';

interface EventHeaderProps {
  event: MacroEvent;
}

const formatEventDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const formatOutcome = (event: MacroEvent) => {
  if (event.event_type === 'MPC') {
    const outcome = event.outcome?.toLowerCase() || '';
    if (outcome.includes('hike')) {
      const bps = outcome.split('+')[1] || '25';
      return `Rate Hike (+${bps} bps)`;
    } else if (outcome.includes('cut')) {
      const bps = outcome.split('-')[1] || '25';
      return `Rate Cut (-${bps} bps)`;
    } else if (outcome === 'hold') {
      return 'Policy Repo Rate Held';
    }
    return event.outcome || 'Policy Decision';
  } else if (event.event_type === 'CPI') {
    return `CPI Inflation at ${event.actual !== null ? event.actual.toFixed(2) : '--'}%`;
  } else if (event.event_type === 'IIP') {
    return `Industrial Production Growth at ${event.actual !== null ? event.actual.toFixed(2) : '--'}%`;
  }
  return event.outcome || 'Macro Event';
};

export default function EventHeader({ event }: EventHeaderProps) {
  const safeSlideRight = useSafeVariants(slideRightVariants);

  // Determine left accent border color based on event type
  let accentBorderClass = 'border-l-[var(--accent-primary)]';
  if (event.event_type === 'CPI') {
    accentBorderClass = 'border-l-[var(--chart-usdinr)]';
  } else if (event.event_type === 'IIP') {
    accentBorderClass = 'border-l-[var(--chart-gsec)]';
  }

  return (
    <motion.div
      variants={safeSlideRight}
      initial="hidden"
      animate="visible"
      className={`noise-overlay relative overflow-hidden rounded-[4px] border border-border-subtle bg-bg-surface p-6 md:p-8 border-l-4 ${accentBorderClass} w-full`}
    >
      <div className="relative z-10 flex flex-col gap-4">
        {/* Top line: event type & date */}
        <div className="flex items-center justify-between gap-4">
          <span className="font-body text-xs tracking-widest text-text-secondary font-semibold uppercase">
            {event.event_type}
          </span>
          <span className="font-mono text-sm text-text-secondary">
            {formatEventDate(event.date)}
          </span>
        </div>

        {/* Main line: outcome */}
        <div>
          <h1 className="font-display italic text-xl md:text-3xl text-text-primary leading-tight">
            {formatOutcome(event)}
          </h1>
        </div>

        {/* Sub line: notes */}
        {event.notes && (
          <div>
            <p className="font-body text-sm md:text-base text-text-secondary leading-normal max-w-[75ch]">
              {event.notes}
            </p>
          </div>
        )}

        {/* Bottom line: SurpriseBadge inline (if not MPC, or if has surprise score) */}
        {event.event_type !== 'MPC' && event.surprise_score !== null && (
          <div className="pt-1">
            <SurpriseBadge score={event.surprise_score} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
