'use client';

import React from 'react';
import Link from 'next/link';
import { EventDetail, MacroEvent } from '../lib/types';
import SurpriseBadge from './Surprisebadge';
import ReactionChart from './ReactionChart';

interface EventDetailViewProps {
  detail: EventDetail;
}

export default function EventDetailView({ detail }: EventDetailViewProps) {
  const { event, snapshots } = detail;

  const getBadgeStyles = (type: 'MPC' | 'CPI' | 'IIP') => {
    switch (type) {
      case 'MPC':
        return 'bg-amber-500/10 text-amber-400 ring-amber-500/20';
      case 'CPI':
        return 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20';
      case 'IIP':
        return 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20';
    }
  };

  const formatOutcomeDetail = (event: MacroEvent) => {
    if (event.event_type === 'MPC') {
      const outcome = event.outcome || '';
      if (outcome.startsWith('hike')) {
        const bps = outcome.split('+')[1] || '25';
        return (
          <div>
            <span className="text-neutral-400 text-xs uppercase tracking-wider block">Decision</span>
            <span className="text-amber-500 font-serif font-bold text-xl sm:text-2xl uppercase">Hike (+{bps} bps)</span>
          </div>
        );
      } else if (outcome.startsWith('cut')) {
        const bps = outcome.split('-')[1] || '25';
        return (
          <div>
            <span className="text-neutral-400 text-xs uppercase tracking-wider block">Decision</span>
            <span className="text-rose-500 font-serif font-bold text-xl sm:text-2xl uppercase">Cut (-{bps} bps)</span>
          </div>
        );
      } else if (outcome === 'hold') {
        return (
          <div>
            <span className="text-neutral-400 text-xs uppercase tracking-wider block">Decision</span>
            <span className="text-white font-serif font-bold text-xl sm:text-2xl uppercase">Policy Hold</span>
          </div>
        );
      }
      return (
        <div>
          <span className="text-neutral-400 text-xs uppercase tracking-wider block">Outcome</span>
          <span className="text-white font-serif font-bold text-xl sm:text-2xl capitalize">{outcome}</span>
        </div>
      );
    } else {
      return (
        <div className="flex gap-8">
          <div>
            <span className="text-neutral-400 text-xs uppercase tracking-wider block">Actual Print</span>
            <span className="text-white font-mono font-bold text-xl sm:text-2xl">
              {event.actual !== null ? `${event.actual.toFixed(2)}%` : '--'}
            </span>
          </div>
          {event.consensus !== null && (
            <div>
              <span className="text-neutral-500 text-xs uppercase tracking-wider block">Consensus</span>
              <span className="text-neutral-300 font-mono font-bold text-xl sm:text-2xl">
                {event.consensus.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      );
    }
  };

  const windowKeys = ['T-60', 'T0', 'T+30', 'T+2H', 'T+1D'] as const;
  const assetRows = [
    { key: 'NIFTY', name: 'Nifty 50' },
    { key: 'USDINR', name: 'USD / INR' },
    { key: 'VIX', name: 'India VIX' },
    { key: 'GSEC', name: '10Y G-Sec Proxy' },
  ] as const;

  const renderCell = (assetKey: 'NIFTY' | 'USDINR' | 'VIX' | 'GSEC', windowKey: typeof windowKeys[number]) => {
    const assetSnap = snapshots[assetKey];
    if (!assetSnap || !assetSnap[windowKey]) {
      return (
        <div className="text-neutral-600 font-mono text-center">—</div>
      );
    }

    const cellData = assetSnap[windowKey];
    const { price, pct_change_from_T60 } = cellData;

    if (pct_change_from_T60 === null) {
      return (
        <div className="text-neutral-600 font-mono text-center">—</div>
      );
    }

    // Colors: negative = red tint, positive = green tint, baseline T-60 = gray
    let cellBg = 'bg-neutral-800/10';
    let cellText = 'text-neutral-300';
    
    if (windowKey === 'T-60') {
      cellBg = 'bg-neutral-800/20';
      cellText = 'text-neutral-400';
    } else if (pct_change_from_T60 > 0.001) {
      cellBg = 'bg-emerald-500/10';
      cellText = 'text-emerald-400';
    } else if (pct_change_from_T60 < -0.001) {
      cellBg = 'bg-rose-500/10';
      cellText = 'text-rose-400';
    }

    const formattedPct = pct_change_from_T60 === 0 
      ? '0.00%' 
      : `${pct_change_from_T60 > 0 ? '+' : ''}${pct_change_from_T60.toFixed(2)}%`;
      
    const formattedPrice = price !== null ? price.toLocaleString('en-IN', {
      maximumFractionDigits: 3
    }) : '';

    return (
      <div className={`rounded px-2.5 py-1.5 text-center ${cellBg} ${cellText}`}>
        <span className="font-mono text-sm font-bold block">{formattedPct}</span>
        {formattedPrice && (
          <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">{formattedPrice}</span>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-brand-amber transition-colors">
          <span>←</span> Back to Event Timeline
        </Link>
      </div>

      {/* Hero Event Banner */}
      <div className="rounded-2xl border border-neutral-800 bg-[#222222] p-6 sm:p-8 shadow-xl mb-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-semibold text-brand-amber bg-brand-amber/10 px-2.5 py-0.5 rounded border border-brand-amber/20">
                {event.date}
              </span>
              <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getBadgeStyles(event.event_type)}`}>
                {event.event_type}
              </span>
              {event.event_type !== 'MPC' && (
                <SurpriseBadge score={event.surprise_score} />
              )}
            </div>

            {formatOutcomeDetail(event)}
          </div>

          {event.notes && (
            <div className="md:max-w-md border-t border-neutral-800 pt-4 md:border-t-0 md:pt-0 md:border-l md:border-neutral-800 md:pl-6">
              <span className="text-neutral-500 text-xs uppercase tracking-wider block mb-1">Event Notes</span>
              <p className="text-sm text-neutral-300 italic font-serif">
                "{event.notes}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Data and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Reaction Table (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-[#222222] p-5 shadow-lg overflow-hidden">
            <div className="mb-4">
              <h3 className="font-serif text-lg font-bold text-white">Market Reactions</h3>
              <p className="text-xs text-neutral-400">Timeline performance across key asset classes from announcement T-60</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 pr-2">Asset Class</th>
                    <th className="pb-3 px-2 text-center">T-60 (Base)</th>
                    <th className="pb-3 px-2 text-center">T0 (Ann.)</th>
                    <th className="pb-3 px-2 text-center">T+30 Min</th>
                    <th className="pb-3 px-2 text-center">T+2 Hour</th>
                    <th className="pb-3 pl-2 text-center">T+1 Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {assetRows.map((row) => (
                    <tr key={row.key} className="hover:bg-neutral-800/10 transition-colors">
                      <td className="py-4 pr-2 font-medium text-white text-sm">
                        {row.name}
                        <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">{row.key}</span>
                      </td>
                      {windowKeys.map((win) => (
                        <td key={win} className="py-4 px-1.5">
                          {renderCell(row.key, win)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Line Chart (5 cols on lg) */}
        <div className="lg:col-span-5">
          <ReactionChart snapshots={snapshots} />
        </div>
      </div>
    </div>
  );
}
