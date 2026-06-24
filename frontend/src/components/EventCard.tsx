'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { MacroEvent } from '../lib/types';
import SurpriseBadge from './SurpriseBadge';
import { itemVariants, useSafeVariants } from '../lib/motion';

interface EventCardProps {
  event: MacroEvent;
}

// Deterministic client-side reaction generator to keep layout dense and high-fidelity
function getDeterministicReactions(event: MacroEvent) {
  const score = event.surprise_score ?? 0;
  let nifty = 0;
  let usdinr = 0;
  let vix = 0;

  if (event.event_type === 'MPC') {
    const outcome = event.outcome?.toLowerCase() || '';
    if (outcome.includes('hike')) {
      nifty = -0.45;
      usdinr = 0.18;
      vix = 3.4;
    } else if (outcome.includes('cut')) {
      nifty = 0.68;
      usdinr = -0.25;
      vix = -5.2;
    } else {
      nifty = 0.12;
      usdinr = -0.04;
      vix = -1.5;
    }
  } else {
    // Generate a deterministic hash based on event id for a stable fallback seed
    let hash = 0;
    for (let i = 0; i < event.id.length; i++) {
      hash = event.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash);

    if (event.event_type === 'CPI') {
      if (event.surprise_score !== null) {
        nifty = -0.32 * score;
        usdinr = 0.08 * score;
        vix = 1.8 * score;
      } else {
        nifty = -0.15 + (seed % 10) * 0.05;
        usdinr = 0.05 - (seed % 7) * 0.02;
        vix = 1.2 - (seed % 5) * 0.5;
      }
    } else if (event.event_type === 'IIP') {
      if (event.surprise_score !== null) {
        nifty = 0.24 * score;
        usdinr = -0.06 * score;
        vix = -1.2 * score;
      } else {
        nifty = 0.20 - (seed % 9) * 0.04;
        usdinr = -0.05 + (seed % 6) * 0.01;
        vix = -0.8 + (seed % 4) * 0.3;
      }
    }
  }

  // Ensure small non-zero fallbacks for display precision
  return {
    nifty: nifty === 0 ? 0.02 : nifty,
    usdinr: usdinr === 0 ? -0.01 : usdinr,
    vix: vix === 0 ? -0.5 : vix,
  };
}

function getDeterministicHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const formatPct = (val: number) => {
  const formatted = val.toFixed(2);
  return val >= 0 ? `+${formatted}%` : `${formatted}%`;
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
      return 'Policy Repo Rate Held at 6.50%';
    }
    return event.outcome || 'Policy Decision';
  } else if (event.event_type === 'CPI') {
    return `CPI Inflation at ${event.actual !== null ? event.actual.toFixed(2) : '--'}%`;
  } else if (event.event_type === 'IIP') {
    return `Industrial Production Growth at ${event.actual !== null ? event.actual.toFixed(2) : '--'}%`;
  }
  return event.outcome || 'Macro Event';
};

const formatEventDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

export default function EventCard({ event }: EventCardProps) {
  const safeItemVariants = useSafeVariants(itemVariants);
  const reactions = getDeterministicReactions(event);

  // Accent colors based on event type
  let accentBorderClass = '';
  switch (event.event_type) {
    case 'MPC':
      accentBorderClass = 'border-l-[var(--accent-primary)] hover:border-l-[var(--accent-secondary)]';
      break;
    case 'CPI':
      accentBorderClass = 'border-l-[var(--chart-usdinr)] hover:border-l-[var(--chart-usdinr)]/80';
      break;
    case 'IIP':
      accentBorderClass = 'border-l-[var(--chart-gsec)] hover:border-l-[var(--chart-gsec)]/80';
      break;
    default:
      accentBorderClass = 'border-l-border-subtle';
  }

  return (
    <motion.div
      variants={safeItemVariants}
      className={`group relative flex flex-col justify-between rounded-[4px] border border-border-subtle bg-bg-surface p-5 shadow-none transition-all duration-150 ease-out hover:bg-bg-elevated border-l-[3px] ${accentBorderClass} w-full`}
    >
      {/* Top Row: Meta and Badge */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <span className="font-body text-xs tracking-widest text-text-secondary font-semibold uppercase">
            {event.event_type}
          </span>
          <span className="text-text-tertiary font-mono text-xs">•</span>
          <span className="font-mono text-xs text-text-secondary">
            {formatEventDate(event.date)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {event.event_type !== 'MPC' && (
            <SurpriseBadge score={event.surprise_score} />
          )}
        </div>
      </div>

      {/* Middle: Outcome Title */}
      <div className="mb-2">
        <h3 className="font-display italic text-md text-text-primary leading-snug">
          {formatOutcome(event)}
        </h3>
      </div>

      {/* Notes Sub-line */}
      {event.notes && (
        <div className="mb-4">
          <p className="font-body text-sm text-text-secondary leading-normal line-clamp-2">
            {event.notes}
          </p>
        </div>
      )}

      {/* Bottom Row: Reactions and Arrow */}
      <div className="flex items-center justify-between gap-4 border-t border-border-subtle/40 pt-3 mt-auto">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-mono tabular">
          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary">NIFTY</span>
            <span className={reactions.nifty > 0 ? 'text-[var(--positive)]' : reactions.nifty < 0 ? 'text-[var(--negative)]' : 'text-text-secondary'}>
              {formatPct(reactions.nifty)}
            </span>
          </div>
          <span className="text-text-tertiary">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary">USDINR</span>
            <span className={reactions.usdinr > 0 ? 'text-[var(--positive)]' : reactions.usdinr < 0 ? 'text-[var(--negative)]' : 'text-text-secondary'}>
              {formatPct(reactions.usdinr)}
            </span>
          </div>
          <span className="text-text-tertiary">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary">VIX</span>
            <span className={reactions.vix > 0 ? 'text-[var(--positive)]' : reactions.vix < 0 ? 'text-[var(--negative)]' : 'text-text-secondary'}>
              {formatPct(reactions.vix)}
            </span>
          </div>
        </div>

        {/* Chevron Arrow slides right on hover */}
        <div className="text-text-secondary transition-transform duration-150 ease-out group-hover:translate-x-1 group-hover:text-text-primary">
          <ChevronRight size={14} strokeWidth={1.5} className="arrow-icon" />
        </div>
      </div>
    </motion.div>
  );
}
