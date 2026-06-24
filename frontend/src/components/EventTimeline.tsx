'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { MacroEvent } from '../lib/types';
import { wakeBackend } from '../lib/api';
import FilterTabs from './FilterTabs';
import EventCard from './EventCard';
import SkeletonCard from './SkeletonCard';
import { useIsMobile } from '../hooks/useIsMobile';
import { itemVariants, useSafeVariants } from '../lib/motion';

const yearGroupVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const bannerVariants: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 },
};

interface EventTimelineProps {
  initialEvents: MacroEvent[];
  initialError: string | null;
}

type TabType = 'ALL' | 'MPC' | 'CPI' | 'IIP';

export default function EventTimeline({ initialEvents, initialError }: EventTimelineProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [isWarming, setIsWarming] = useState(false);
  const [events, setEvents] = useState<MacroEvent[]>(initialEvents);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(initialEvents.length > 0 || !!initialError);

  const isMobile = useIsMobile();
  const safeItemVariants = useSafeVariants(itemVariants);
  const safeBannerVariants = useSafeVariants(bannerVariants);

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
        setHasLoaded(true);
      } catch (err) {
        setIsWarming(true);
        try {
          await wakeBackend();
          setIsWarming(false);
          const eventsRes = await fetch(`${baseUrl}/events?limit=100`, { cache: 'no-store' });
          if (eventsRes.ok) {
            const data = await eventsRes.json();
            setEvents(data.events);
          } else {
            setErrorMsg('Failed to load events after backend wake-up.');
          }
          setHasLoaded(true);
        } catch (wakeErr) {
          console.error('Failed to wake backend:', wakeErr);
          setIsWarming(false);
          setHasLoaded(true);
        }
      }
    };

    checkBackendHealth();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (activeTab === 'ALL') return true;
    return e.event_type === activeTab;
  });

  const groupedEvents: { [key: string]: MacroEvent[] } = {};
  filteredEvents.forEach((e) => {
    const year = e.date.substring(0, 4);
    if (!groupedEvents[year]) {
      groupedEvents[year] = [];
    }
    groupedEvents[year].push(e);
  });

  const sortedYears = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a));

  const isLoading = !hasLoaded && !errorMsg && !initialError;
  const maxStaggerItems = isMobile ? 8 : Infinity;

  return (
    <div className="w-full">
      {/* Cold-start Warming Banner */}
      <AnimatePresence>
        {isWarming && (
          <motion.div
            variants={safeBannerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-6 rounded border border-border-strong bg-bg-surface p-4 flex items-center gap-3"
          >
            <div className="spinner shrink-0" />
            <span className="text-sm font-body text-accent-primary">
              Server warming up (~15s)… Waking up the cloud database. Please stand by.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Filter Bar (stays below navbar on desktop, at top on mobile) */}
      <div className="sticky top-0 md:top-[56px] z-40 bg-bg-base/90 backdrop-blur-md py-3 border-b border-border-subtle/40 mb-8">
        <div className="flex items-center justify-between gap-4 w-full">
          <FilterTabs active={activeTab} onChange={(tab) => setActiveTab(tab as TabType)} />
            <div className="font-body text-xs text-text-tertiary tracking-widest hidden sm:block">
            RANGE: 2018 – 2026 • ALL TIME
          </div>
        </div>
      </div>

      {/* Error States */}
      {(initialError || errorMsg) && filteredEvents.length === 0 && (
        <div className="rounded border border-negative/20 bg-negative/5 p-6 text-center">
          <p className="text-[var(--negative)] font-body font-medium">Error loading timeline events</p>
          <p className="text-text-secondary text-sm mt-1 font-mono">{errorMsg || initialError}</p>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredEvents.length === 0 && (
        <div className="py-20 text-center border border-border-subtle rounded bg-bg-surface">
          <p className="font-display italic text-lg text-text-tertiary">
            No events available for this category
          </p>
          <p className="font-body text-xs text-text-tertiary mt-2">
            Intraday data and history are fully synchronized, check other filters.
          </p>
        </div>
      )}

      {/* Timeline List */}
      {!isLoading && filteredEvents.length > 0 && (
        <div className="space-y-12">
          {sortedYears.map((year) => (
            <motion.div
              key={year}
              variants={yearGroupVariants}
              initial="hidden"
              animate="visible"
              className="relative"
            >
              {/* Year Divider — left-aligned with extending rule */}
              <div className="flex items-center gap-4 my-8">
                <span className="font-display text-2xl text-text-tertiary select-none shrink-0">
                  {year}
                </span>
                <hr className="flex-1 border-border-subtle/60" />
              </div>

              {/* Timeline Cards Stack */}
              {/* Desktop thin vertical line connector on the left */}
              <div className="relative md:border-l md:border-border-subtle md:pl-8 md:ml-4 flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {groupedEvents[year].map((event, idx) => {
                    const shouldAnimate = idx < maxStaggerItems;
                    return (
                      <motion.div
                        key={event.id}
                        layout
                        variants={shouldAnimate ? safeItemVariants : undefined}
                        initial={shouldAnimate ? 'hidden' : 'visible'}
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="w-full"
                      >
                        <Link href={`/events/${event.id}`} className="block w-full">
                          <EventCard event={event} />
                        </Link>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
