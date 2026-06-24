'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MacroEvent } from '../lib/types';
import { wakeBackend } from '../lib/api';
import SurpriseBadge from './SurpriseBadge';

interface EventTimelineProps {
  initialEvents: MacroEvent[];
  initialError: string | null;
}

type TabType = 'All' | 'MPC' | 'CPI' | 'IIP';

export default function EventTimeline({ initialEvents, initialError }: EventTimelineProps) {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [isWarming, setIsWarming] = useState(false);
  const [events, setEvents] = useState<MacroEvent[]>(initialEvents);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Client-side backend warming check
  useEffect(() => {
    const checkBackendHealth = async () => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${baseUrl}/health`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error('Not OK response');
        }
      } catch (err) {
        // Server is likely cold or unreachable
        setIsWarming(true);
        try {
          await wakeBackend();
          setIsWarming(false);
          // If server was cold, our server-side load might have returned empty or failed.
          // Let's refetch the events on the client once the server is awake!
          const eventsRes = await fetch(`${baseUrl}/events?limit=100`, { cache: 'no-store' });
          if (eventsRes.ok) {
            const data = await eventsRes.json();
            setEvents(data.events);
          } else {
            setErrorMsg('Failed to load events after backend wake-up.');
          }
        } catch (wakeErr) {
          console.error('Failed to wake backend:', wakeErr);
        }
      }
    };

    checkBackendHealth();
  }, []);

  // Filter events based on active tab
  const filteredEvents = events.filter((e) => {
    if (activeTab === 'All') return true;
    return e.event_type === activeTab;
  });

  // Group events by year
  const groupedEvents: { [key: string]: MacroEvent[] } = {};
  filteredEvents.forEach((e) => {
    const year = e.date.substring(0, 4);
    if (!groupedEvents[year]) {
      groupedEvents[year] = [];
    }
    groupedEvents[year].push(e);
  });

  // Sort years in descending order
  const sortedYears = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a));

  // Helper to format outcome description
  const renderOutcome = (event: MacroEvent) => {
    if (event.event_type === 'MPC') {
      const outcome = event.outcome || '';
      if (outcome.startsWith('hike')) {
        const bps = outcome.split('+')[1] || '25';
        return <span className="text-amber-500 font-semibold uppercase tracking-wider">Hike (+{bps} bps)</span>;
      } else if (outcome.startsWith('cut')) {
        const bps = outcome.split('-')[1] || '25';
        return <span className="text-rose-500 font-semibold uppercase tracking-wider">Cut (-{bps} bps)</span>;
      } else if (outcome === 'hold') {
        return <span className="text-neutral-300 font-semibold uppercase tracking-wider">Hold</span>;
      }
      return <span className="text-neutral-400 capitalize">{outcome}</span>;
    } else {
      return (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <span className="text-neutral-400 text-xs uppercase tracking-wider block">Actual</span>
            <span className="text-white font-mono font-bold text-base">
              {event.actual !== null ? `${event.actual.toFixed(2)}%` : '--'}
            </span>
          </div>
          {event.consensus !== null && (
            <div className="border-t border-neutral-800 pt-1 sm:border-t-0 sm:pt-0 sm:border-l sm:border-neutral-700 sm:pl-4">
              <span className="text-neutral-500 text-xs uppercase tracking-wider block">Consensus</span>
              <span className="text-neutral-300 font-mono text-sm">
                {event.consensus.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      );
    }
  };

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Warm up Banner */}
      {isWarming && (
        <div className="mb-6 rounded border border-amber-500/20 bg-amber-500/5 p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-sm font-medium text-amber-300">
              Server warming up… Backend is waking up from its cold start (Render free tier). Please stand by.
            </span>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          Macroeconomic Event <span className="text-brand-amber">Timeline</span>
        </h1>
        <p className="mt-3 text-lg text-neutral-400 max-w-3xl">
          Track interest rate decisions, inflation, and industrial production data, mapping instant and overnight market reactions across Indian asset classes.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-8 border-b border-neutral-800">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-px">
          {(['All', 'MPC', 'CPI', 'IIP'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap -mb-px ${
                activeTab === tab
                  ? 'border-brand-amber text-brand-amber font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
              }`}
            >
              {tab === 'All' ? 'All Events' : tab === 'MPC' ? 'RBI Policy (MPC)' : tab === 'CPI' ? 'Inflation (CPI)' : 'Industrial Output (IIP)'}
            </button>
          ))}
        </div>
      </div>

      {initialError && events.length === 0 && (
        <div className="rounded border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-red-400 font-medium">Error loading timeline events</p>
          <p className="text-neutral-500 text-sm mt-1">{initialError}</p>
        </div>
      )}

      {errorMsg && (
        <div className="rounded border border-red-500/20 bg-red-500/5 p-6 text-center mb-6">
          <p className="text-red-400 font-medium">Error</p>
          <p className="text-neutral-500 text-sm mt-1">{errorMsg}</p>
        </div>
      )}

      {events.length === 0 && !initialError && (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-amber border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="text-neutral-400 mt-4 font-medium">Fetching events calendar data...</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="relative">
          {/* Vertical line through timeline */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-800 md:left-1/2 md:-ml-px"></div>

          <div className="space-y-12">
            {sortedYears.map((year) => (
              <div key={year} className="relative">
                {/* Year Heading */}
                <div className="sticky top-16 z-10 py-2 md:text-center">
                  <span className="inline-flex rounded-full bg-neutral-900 border border-neutral-700 px-4 py-1 text-base font-bold font-display text-brand-amber shadow-md shadow-black/50">
                    {year}
                  </span>
                </div>

                <div className="mt-8 space-y-6">
                  {groupedEvents[year].map((event, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <div
                        key={event.id}
                        className={`relative flex flex-col md:flex-row md:justify-between items-start md:items-center ${
                          isEven ? '' : 'md:flex-row-reverse'
                        }`}
                      >
                        {/* Empty spacing panel for alignment */}
                        <div className="hidden md:block w-5/12"></div>

                        {/* Node marker on vertical line */}
                        <div className="absolute left-4 top-8 -ml-1.5 h-3.5 w-3.5 rounded-full border-2 border-neutral-900 bg-brand-amber md:left-1/2 md:top-1/2 md:-mt-1.5 md:-ml-1.5"></div>

                        {/* Event Card */}
                        <Link
                          href={`/events/${event.id}`}
                          className="w-full md:w-5/12 pl-10 md:pl-0 block transition-transform duration-300 hover:scale-[1.01]"
                        >
                          <div className="rounded-xl border border-neutral-800 bg-[#222222] p-5 shadow-lg hover:border-brand-amber/50 hover:bg-[#252525] transition-all duration-300">
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="font-mono text-sm font-semibold text-neutral-400">
                                {event.date}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${getBadgeStyles(event.event_type)}`}>
                                  {event.event_type}
                                </span>
                                {event.event_type !== 'MPC' && (
                                  <SurpriseBadge score={event.surprise_score} />
                                )}
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="mb-3">
                              {renderOutcome(event)}
                            </div>

                            {/* Notes */}
                            {event.notes && (
                              <p className="text-neutral-400 text-xs border-t border-neutral-800/80 pt-2 line-clamp-2 italic">
                                {event.notes}
                              </p>
                            )}
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
