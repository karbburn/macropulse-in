'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Gavel, TrendingUp, BarChart3 } from 'lucide-react';
import { MacroEvent } from '../lib/types';
import { formatOutcome, formatEventDate } from '../lib/format';
import SurpriseBadge from './SurpriseBadge';
import { slideRightVariants, useSafeVariants } from '../lib/motion';

interface EventHeaderProps {
  event: MacroEvent;
}

// Helper to get category-specific icon
const getEventIcon = (type: string) => {
  const iconProps = {
    size: 14,
    strokeWidth: 1.5,
    className: "shrink-0",
  };
  switch (type) {
    case 'MPC':
      return <Gavel {...iconProps} />;
    case 'CPI':
      return <TrendingUp {...iconProps} />;
    case 'IIP':
      return <BarChart3 {...iconProps} />;
    default:
      return null;
  }
};

export default function EventHeader({ event }: EventHeaderProps) {
  const safeSlideRight = useSafeVariants(slideRightVariants);

  const eventColor = `var(--event-${event.event_type.toLowerCase()})`;

  return (
    <motion.div
      variants={safeSlideRight}
      initial="hidden"
      animate="visible"
      className="noise-overlay relative overflow-hidden rounded-[4px] border border-border-subtle bg-bg-surface pl-5 pr-6 py-6 md:pl-7 md:pr-8 md:py-8 w-full"
    >
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <span 
            className="flex items-center gap-1.5 font-body text-xs tracking-widest font-semibold uppercase"
            style={{ color: eventColor }}
          >
            {getEventIcon(event.event_type)}
            <span>{event.event_type}</span>
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
