import React from 'react';
import { fetchEvents } from '../lib/api';
import { MacroEvent } from '../lib/types';
import EventTimeline from '../components/EventTimeline';
import { PageWrapper } from '../components/PageWrapper';

// Revalidate once per hour
export const revalidate = 3600;

export default async function Page() {
  let events: MacroEvent[] = [];
  let errorMsg: string | null = null;

  try {
    const data = await fetchEvents('all', undefined, undefined, 100);
    events = data.events;
  } catch (err) {
    console.error('Error in server component fetchEvents:', err);
    errorMsg = err instanceof Error ? err.message : 'Failed to load timeline events';
  }

  return (
    <PageWrapper>
      <div className="max-w-[860px] mx-auto px-4 md:px-0 pb-16">
        {/* Ticker Strip (Desktop Only) */}
        <div className="flex h-10 items-center justify-end mb-6">
          {/* Infinite Scrolling Ticker (Desktop Only) */}
          <div className="hidden md:block overflow-hidden relative font-mono text-xs text-text-secondary select-none max-w-[450px]">
            <div className="ticker-track flex items-center gap-16 whitespace-nowrap">
              <span className="shrink-0 flex items-center gap-4">
                RBI REPO: 6.50% <span className="text-text-tertiary font-body">•</span> CPI: 5.08% <span className="text-text-tertiary font-body">•</span> IIP: 4.2% <span className="text-text-tertiary font-body">•</span> NIFTY: 22,530
              </span>
              <span className="shrink-0 flex items-center gap-4" aria-hidden="true">
                RBI REPO: 6.50% <span className="text-text-tertiary font-body">•</span> CPI: 5.08% <span className="text-text-tertiary font-body">•</span> IIP: 4.2% <span className="text-text-tertiary font-body">•</span> NIFTY: 22,530
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
