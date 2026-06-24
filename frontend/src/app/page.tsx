import React from 'react';
import { fetchEvents, fetchLatestRates } from '../lib/api';
import { MacroEvent } from '../lib/types';

import EventTimeline from '../components/EventTimeline';
import { PageWrapper } from '../components/PageWrapper';

// Revalidate once per hour
export const revalidate = 3600;

export default async function Page() {
  let events: MacroEvent[] = [];
  let errorMsg: string | null = null;
  let rates = null;

  try {
    const data = await fetchEvents('all', undefined, undefined, 100);
    events = data.events;
  } catch (err) {
    console.error('Error in server component fetchEvents:', err);
    errorMsg = err instanceof Error ? err.message : 'Failed to load timeline events';
  }

  try {
    rates = await fetchLatestRates();
  } catch (err) {
    console.error('Error in server component fetchLatestRates:', err);
  }

  const fmtRepo = (val: number | null) =>
    val != null ? `${val.toFixed(2)}%` : '-';

  const fmtPct = (val: number | null) =>
    val != null ? `${val}%` : '-';

  const niftyLabel = rates?.nifty_price != null
    ? `${rates.nifty_price.toLocaleString('en-IN')}${rates.nifty_change_pct != null ? ` (${rates.nifty_change_pct > 0 ? '+' : ''}${rates.nifty_change_pct}%)` : ''}`
    : '-';


  return (
    <PageWrapper>
      <div className="max-w-[860px] mx-auto px-4 md:px-0 pb-16">
        {/* Ticker Strip (Desktop Only) */}
        <div className="flex h-10 items-center justify-end mb-6">
          {/* Infinite Scrolling Ticker (Desktop Only) */}
          <div className="hidden md:block overflow-hidden relative font-mono text-xs text-text-secondary select-none max-w-[450px]">
            <div className="ticker-track flex items-center gap-16 whitespace-nowrap">
              <span className="shrink-0 flex items-center gap-4">
                RBI REPO: {fmtRepo(rates?.repo_rate ?? null)} <span className="text-text-tertiary font-body">•</span> CPI: {fmtPct(rates?.cpi_actual ?? null)} <span className="text-text-tertiary font-body">•</span> IIP: {fmtPct(rates?.iip_actual ?? null)} <span className="text-text-tertiary font-body">•</span> NIFTY: {niftyLabel}
              </span>
              <span className="shrink-0 flex items-center gap-4" aria-hidden="true">
                RBI REPO: {fmtRepo(rates?.repo_rate ?? null)} <span className="text-text-tertiary font-body">•</span> CPI: {fmtPct(rates?.cpi_actual ?? null)} <span className="text-text-tertiary font-body">•</span> IIP: {fmtPct(rates?.iip_actual ?? null)} <span className="text-text-tertiary font-body">•</span> NIFTY: {niftyLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Main Event Timeline */}
        <EventTimeline initialEvents={events} initialError={errorMsg} />
      </div>
    </PageWrapper>
  );
}
