'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { EventDetail, MacroEvent } from '../lib/types';
import { formatOutcome } from '../lib/format';
import EventHeader from './EventHeader';
import MetricChips from './MetricChips';
import ReactionLineChart from './ReactionLineChart';
import ReactionTable from './ReactionTable';
import { useCountUp } from '../hooks/useCountUp';
import { chartVariants, scaleVariants, useSafeVariants } from '../lib/motion';

interface EventDetailViewProps {
  detail: EventDetail;
  prevEvent: MacroEvent | null;
  nextEvent: MacroEvent | null;
}

const getSurpriseContext = (eventType: string, score: number | null, outcome: string) => {
  if (eventType === 'MPC') {
    const lowerOutcome = outcome.toLowerCase();
    if (lowerOutcome.includes('hike')) {
      return "Hawkish stance to anchor inflation expectations.";
    } else if (lowerOutcome.includes('cut')) {
      return "Dovish shift to stimulate economic activity.";
    } else {
      return "Cautious, data-dependent approach maintained.";
    }
  }

  if (score === null || score === undefined) {
    return "No surprise score calculated for this event.";
  }

  const absScore = Math.abs(score);
  const direction = score > 0 ? 'above' : 'below';

  if (eventType === 'CPI') {
    if (absScore < 0.5) {
      return "Inflation print aligned with consensus.";
    } else if (absScore <= 1.5) {
      return `CPI ${direction} expectations (${absScore.toFixed(1)}σ surprise).`;
    } else {
      return `Major CPI surprise of ${score.toFixed(1)}σ — expect volatility.`;
    }
  }

  if (eventType === 'IIP') {
    if (absScore < 0.5) {
      return "Industrial output matched consensus.";
    } else if (absScore <= 1.5) {
      return `IIP grew ${score > 0 ? 'faster' : 'slower'} than expected (${absScore.toFixed(1)}σ).`;
    } else {
      return `Major IIP surprise of ${score.toFixed(1)}σ — ${score > 0 ? 'acceleration' : 'contraction'} in activity.`;
    }
  }

  return "Unexpected macro print — market analyzing implications.";
};

export default function EventDetailView({ detail, prevEvent, nextEvent }: EventDetailViewProps) {
  const { event, snapshots } = detail;

  const [startCount, setStartCount] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setStartCount(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const animatedScore = useCountUp(startCount ? (event.surprise_score ?? 0) : 0, 600);

  const safeChartVariants = useSafeVariants(chartVariants);
  const safeScaleVariants = useSafeVariants(scaleVariants);

  const hasSurprise = event.surprise_score !== null;
  const absScore = Math.abs(animatedScore);
  const isPositive = event.surprise_score !== null && event.surprise_score > 0;
  const isNegative = event.surprise_score !== null && event.surprise_score < 0;
  
  let scoreSymbol = '-';
  let scoreColorClass = 'text-text-secondary';

  
  if (hasSurprise) {
    scoreSymbol = isPositive ? '▲' : isNegative ? '▼' : '';
    if (Math.abs(event.surprise_score ?? 0) < 0.5) {
      scoreColorClass = 'text-[var(--surprise-low)]';
    } else if (Math.abs(event.surprise_score ?? 0) <= 1.5) {
      scoreColorClass = 'text-[var(--surprise-mid)]';
    } else {
      scoreColorClass = 'text-[var(--surprise-high)]';
    }
  }

  return (
    <div
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6 md:gap-8"
    >
      <div>
        <Link 
          href="/" 
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors font-body text-sm select-none group"
        >
          <ChevronLeft 
            size={16} 
            strokeWidth={1.5} 
            className="transition-transform duration-150 group-hover:-translate-x-0.5" 
          />
          <span>Timeline</span>
        </Link>
      </div>

      <EventHeader event={event} />

      <div className="w-full">
        <MetricChips snapshots={snapshots} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
        
        <motion.div 
          className="lg:col-span-7 flex flex-col gap-3"
          variants={safeChartVariants}
          initial="hidden"
          animate="visible"
        >
          <span className="font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase select-none">
            Cross-Asset Reaction Window
          </span>
          <div className="rounded-[4px] border border-border-subtle bg-bg-surface p-5 hover:border-border-strong transition-colors">
            <ReactionLineChart snapshots={snapshots} />
          </div>
        </motion.div>

        <motion.div 
          className="lg:col-span-5 flex flex-col gap-3"
          variants={safeScaleVariants}
          initial="hidden"
          animate="visible"
        >
          <span className="font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase select-none">
            Surprise Analysis
          </span>
          <div className="rounded-[4px] border border-border-subtle bg-bg-surface p-6 flex flex-col gap-6 hover:border-border-strong transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col">
                <span className="font-body text-xs text-text-secondary uppercase tracking-wider">
                  Surprise Deviation
                </span>
                <span className="font-body text-[10px] text-text-tertiary uppercase tracking-wider mt-1">
                  Historical volatility metric
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`font-mono font-bold text-4xl md:text-5xl tracking-tight tabular-nums leading-none ${scoreColorClass}`}>
                  {scoreSymbol}{absScore.toFixed(1)}<span className="text-sm font-semibold ml-0.5">σ</span>
                </span>
              </div>
            </div>

            <hr className="border-border-subtle/60" />

            <div className="grid grid-cols-2 gap-4">
              {event.event_type === 'MPC' ? (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="font-body text-xs text-text-tertiary uppercase tracking-wider">
                      Actual Policy
                    </span>
                    <span className="font-display italic text-base font-semibold text-text-primary leading-tight">
                      {event.outcome === 'hold' ? 'Repo Hold' : event.outcome === 'hike' ? 'Rate Hike' : event.outcome === 'cut' ? 'Rate Cut' : event.outcome}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-body text-xs text-text-tertiary uppercase tracking-wider">
                      Consensus
                    </span>
                    <span className="font-body text-sm font-semibold text-text-secondary leading-tight">
                      {event.outcome === 'hold' ? 'Hold expected' : 'Adjust expected'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="font-body text-xs text-text-tertiary uppercase tracking-wider">
                      Actual Print
                    </span>
                    <span className="font-mono text-lg font-bold text-text-primary tabular-nums">
                      {event.actual !== null ? `${event.actual.toFixed(2)}%` : '-'}

                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-body text-xs text-text-tertiary uppercase tracking-wider">
                      Consensus
                    </span>
                    <span className="font-mono text-lg font-semibold text-text-secondary tabular-nums">
                      {event.consensus !== null ? `${event.consensus.toFixed(2)}%` : '-'}

                    </span>
                  </div>
                </>
              )}
            </div>

            <hr className="border-border-subtle/60" />

            <div className="flex flex-col gap-2">
              <span className="font-body text-xs text-text-tertiary uppercase tracking-wider">
                Macroeconomic Assessment
              </span>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                {getSurpriseContext(event.event_type, event.surprise_score, event.outcome || '')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="w-full flex flex-col gap-3 mt-4">
        <span className="font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase select-none">
          Cross-Asset Reaction Matrix
        </span>
        <ReactionTable snapshots={snapshots} />
      </div>

      <div className="border-t border-border-subtle pt-8 mt-12 flex flex-col sm:flex-row gap-6 justify-between select-none">
        <div className="flex-1">
          {prevEvent ? (
            <Link 
              href={`/events/${prevEvent.id}`}
              className="flex flex-col gap-1 group text-left max-w-sm"
            >
              <span className="font-body text-xs font-semibold tracking-wider text-text-tertiary uppercase group-hover:text-[var(--accent-primary)] transition-colors">
                ← PREVIOUS {event.event_type}
              </span>
              <span className="font-mono text-xs text-text-secondary mt-1 group-hover:text-text-primary transition-colors">
                {prevEvent.date}
              </span>
              <span className="font-display italic text-sm text-text-tertiary group-hover:text-text-secondary transition-colors line-clamp-1">
                {formatOutcome(prevEvent)}
              </span>
            </Link>
          ) : (
            <div className="flex flex-col gap-1 text-left opacity-40">
              <span className="font-body text-xs font-semibold tracking-wider text-text-tertiary uppercase">
                ← PREVIOUS {event.event_type}
              </span>
              <span className="font-body text-xs text-text-tertiary mt-1">
                End of historical data
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 flex sm:justify-end">
          {nextEvent ? (
            <Link 
              href={`/events/${nextEvent.id}`}
              className="flex flex-col gap-1 group text-left sm:text-right max-w-sm"
            >
              <span className="font-body text-xs font-semibold tracking-wider text-text-tertiary uppercase group-hover:text-[var(--accent-primary)] transition-colors">
                NEXT {event.event_type} →
              </span>
              <span className="font-mono text-xs text-text-secondary mt-1 group-hover:text-text-primary transition-colors">
                {nextEvent.date}
              </span>
              <span className="font-display italic text-sm text-text-tertiary group-hover:text-text-secondary transition-colors line-clamp-1">
                {formatOutcome(nextEvent)}
              </span>
            </Link>
          ) : (
            <div className="flex flex-col gap-1 text-left sm:text-right opacity-40">
              <span className="font-body text-xs font-semibold tracking-wider text-text-tertiary uppercase">
                NEXT {event.event_type} →
              </span>
              <span className="font-body text-xs text-text-tertiary mt-1">
                End of historical data
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
