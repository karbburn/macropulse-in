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
        {/* Hero Strip (80px height) */}
        <div className="flex h-20 items-center justify-between border-b border-border-subtle/40 mb-6">
          <div className="shrink-0 flex flex-col justify-center">
            <h1 className="font-display text-xl text-text-primary tracking-tight font-bold">
              MacroPulse
            </h1>
            <p className="font-body text-[10px] text-text-secondary uppercase tracking-widest mt-0.5 select-none">
              India Macro Event Impact Tracker
            </p>
          </div>

          {/* Infinite Scrolling Ticker (Desktop Only) */}
          <div className="hidden md:block overflow-hidden relative font-mono text-xs text-text-secondary select-none max-w-[450px]">
            <div className="ticker-track flex items-center gap-16 whitespace-nowrap">
              <span className="shrink-0 flex items-center gap-4">
                RBI REPO: 6.50% <span className="text-text-tertiary font-sans">•</span> CPI: 5.08% <span className="text-text-tertiary font-sans">•</span> IIP: 4.2% <span className="text-text-tertiary font-sans">•</span> NIFTY: 22,530
              </span>
              <span className="shrink-0 flex items-center gap-4" aria-hidden="true">
                RBI REPO: 6.50% <span className="text-text-tertiary font-sans">•</span> CPI: 5.08% <span className="text-text-tertiary font-sans">•</span> IIP: 4.2% <span className="text-text-tertiary font-sans">•</span> NIFTY: 22,530
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
