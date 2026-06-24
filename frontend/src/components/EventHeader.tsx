'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MacroEvent } from '../lib/types';
import { formatOutcome, formatEventDate } from '../lib/format';
import SurpriseBadge from './SurpriseBadge';
import { slideRightVariants, useSafeVariants } from '../lib/motion';

interface EventHeaderProps {
  event: MacroEvent;
}

export default function EventHeader({ event }: EventHeaderProps) {
  const safeSlideRight = useSafeVariants(slideRightVariants);

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
        <div className="flex items-center justify-between gap-4">
          <span className="font-body text-xs tracking-widest text-text-secondary font-semibold uppercase">
            {event.event_type}
          </span>
          <span className="font-mono text-sm text-text-secondary">
            {formatEventDate(event.date)}
          </span>
        </div>

        <div>
          <h1 className="font-display italic text-xl md:text-3xl text-text-primary leading-tight">
            {formatOutcome(event)}
          </h1>
        </div>

        {event.notes && (
          <div>
            <p className="font-body text-sm md:text-base text-text-secondary leading-normal max-w-[75ch]">
              {event.notes}
            </p>
          </div>
        )}

        {event.event_type !== 'MPC' && event.surprise_score !== null && (
          <div className="pt-1">
            <SurpriseBadge score={event.surprise_score} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
