import React from 'react';
import { fetchEvents } from '../lib/api';
import { MacroEvent } from '../lib/types';

import EventTimeline from '../components/EventTimeline';
import TickerStrip from '../components/TickerStrip';
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
        {/* Mobile Wordmark */}
        <div className="md:hidden mb-6 text-center pt-2">
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              color: 'var(--accent-primary)',
              letterSpacing: 'var(--tracking-tight)',
              display: 'inline-block',
            }}
          >
            MacroPulse
          </span>
        </div>

        {/* Ticker Strip (Desktop Only) */}
        <div className="flex h-10 items-center justify-end mb-6">
          <TickerStrip />
        </div>

        {/* Main Event Timeline */}
        <EventTimeline initialEvents={events} initialError={errorMsg} />
      </div>
    </PageWrapper>
  );
}
