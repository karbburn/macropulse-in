'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { EventDetail, MacroEvent } from '../lib/types';
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
    return `IIP Growth at ${event.actual !== null ? event.actual.toFixed(2) : '--'}%`;
  }
  return event.outcome || 'Macro Event';
};

const getSurpriseContext = (eventType: string, score: number | null, outcome: string) => {
  if (eventType === 'MPC') {
    const lowerOutcome = outcome.toLowerCase();
    if (lowerOutcome.includes('hike')) {
      return "The monetary tightening action represents a hawkish stance aimed at anchoring inflation expectations and curbing demand-side pressures. This decision signals a proactive approach by the committee to maintain price stability, despite potential short-term headwinds to economic growth.";
    } else if (lowerOutcome.includes('cut')) {
      return "The policy rate reduction marks a dovish shift designed to stimulate economic activity, reduce borrowing costs, and bolster liquidity. This accommodating measure indicates the committee's pivot towards supporting growth as inflation prints moderate within the target band.";
    } else {
      return "The decision to maintain the policy repo rate reflects a cautious, data-dependent approach. The committee remains focused on the progressive withdrawal of accommodation to ensure inflation aligns durably with the target, while keeping a watchful eye on domestic growth momentum.";
    }
  }

  if (score === null || score === undefined) {
    return "No surprise score is calculated for this event. Market impact is expected to follow historical baseline trends for this category of macro announcements.";
  }

  const absScore = Math.abs(score);
  const isPos = score > 0;

  if (eventType === 'CPI') {
    if (absScore < 0.5) {
      return "The inflation print aligns almost perfectly with market consensus. This in-line data offers reassurance to the central bank, suggesting that current monetary policy settings are appropriate and reducing the likelihood of any sudden rate adjustments.";
    } else if (absScore <= 1.5) {
      return `CPI inflation printed ${isPos ? 'above' : 'below'} expectations with a mild surprise of ${absScore.toFixed(1)}σ. This moderate deviation will prompt minor revisions to inflation projections, but is unlikely to trigger a major policy redirection in the near term.`;
    } else {
      return `A substantial CPI surprise of ${score.toFixed(1)}σ. This significant deviation from expectations represents a major macroeconomic shock that will likely force a re-evaluation of policy timelines, causing immediate volatility in sovereign bond yields and equity markets.`;
    }
  }

  if (eventType === 'IIP') {
    if (absScore < 0.5) {
      return "Industrial output growth matches consensus expectations, confirming stable industrial momentum. This reinforces the prevailing economic growth narrative and provides a neutral backdrop for policy deliberations.";
    } else if (absScore <= 1.5) {
      return `Industrial production grew ${isPos ? 'faster' : 'slower'} than anticipated with a mild surprise of ${absScore.toFixed(1)}σ. This suggests resilient economic demand and will be viewed as a moderate data point in upcoming central bank rate decisions.`;
    } else {
      return `A major industrial production surprise of ${score.toFixed(1)}σ. This sharp deviation indicates an unexpected ${isPos ? 'acceleration' : 'contraction'} in manufacturing and industrial activity, which could impact macroeconomic growth forecasts and market sentiment.`;
    }
  }

  return "An unexpected macroeconomic print. Market participants are analyzing the deviation from consensus to determine its long-term implications on interest rates and corporate earnings.";
};

export default function EventDetailView({ detail, prevEvent, nextEvent }: EventDetailViewProps) {
  const { event, snapshots } = detail;

  // Trigger surprise score count-up after 800ms
  const [startCount, setStartCount] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setStartCount(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const animatedScore = useCountUp(startCount ? (event.surprise_score ?? 0) : 0, 600);

  const safeChartVariants = useSafeVariants(chartVariants);
  const safeScaleVariants = useSafeVariants(scaleVariants);

  // Format surprise score representation
  const hasSurprise = event.surprise_score !== null;
  const absScore = Math.abs(animatedScore);
  const isPositive = event.surprise_score !== null && event.surprise_score > 0;
  const isNegative = event.surprise_score !== null && event.surprise_score < 0;
  
  let scoreSymbol = '—';
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
      {/* Breadcrumb: ← Timeline */}
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

      {/* STEP 1: EventHeader at 0ms */}
      <EventHeader event={event} />

      {/* STEP 2: MetricChips staggered at 180ms */}
      <div className="w-full">
        <MetricChips snapshots={snapshots} />
      </div>

      {/* STEP 3 & 4 & 6: Two-column layout on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
        
        {/* Left Column: ReactionLineChart (60%) */}
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

        {/* Right Column: Surprise Analysis card (40%) */}
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
            {/* Surprise Score Card Section */}
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

            {/* Actual vs Consensus section */}
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
                      {event.actual !== null ? `${event.actual.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-body text-xs text-text-tertiary uppercase tracking-wider">
                      Consensus
                    </span>
                    <span className="font-mono text-lg font-semibold text-text-secondary tabular-nums">
                      {event.consensus !== null ? `${event.consensus.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <hr className="border-border-subtle/60" />

            {/* Historical Context section */}
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

      {/* STEP 5 & 6: Full-width ReactionTable staggered starting at 600ms */}
      <div className="w-full flex flex-col gap-3 mt-4">
        <span className="font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase select-none">
          Cross-Asset Reaction Matrix
        </span>
        <ReactionTable snapshots={snapshots} />
      </div>

      {/* STEP 6: Related Events strip at bottom */}
      <div className="border-t border-border-subtle pt-8 mt-12 flex flex-col sm:flex-row gap-6 justify-between select-none">
        {/* Previous Event Link */}
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

        {/* Next Event Link */}
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
