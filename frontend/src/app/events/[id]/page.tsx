import React from 'react';
import { notFound } from 'next/navigation';
import { fetchEventDetail, fetchEvents } from '../../../lib/api';
import EventDetailView from '../../../components/EventDetailView';
import { PageWrapper } from '../../../components/PageWrapper';
import { MacroEvent } from '../../../lib/types';

// Revalidate once per hour
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  try {
    const detail = await fetchEventDetail(id);
    if (!detail || !detail.event) {
      return notFound();
    }

    // Fetch related events of the same type to find previous and next chronologically
    let prevEvent: MacroEvent | null = null;
    let nextEvent: MacroEvent | null = null;

    try {
      const relatedData = await fetchEvents(detail.event.event_type, undefined, undefined, 100);
      if (relatedData && relatedData.events) {
        // Sort chronologically by date
        const sortedEvents = [...relatedData.events].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const currentIndex = sortedEvents.findIndex((e) => e.id === detail.event.id);
        if (currentIndex !== -1) {
          if (currentIndex > 0) {
            prevEvent = sortedEvents[currentIndex - 1];
          }
          if (currentIndex < sortedEvents.length - 1) {
            nextEvent = sortedEvents[currentIndex + 1];
          }
        }
      }
    } catch (relatedErr) {
      console.error('Failed to fetch related events:', relatedErr);
      // Fail silently to not block rendering of the main event details
    }

    return (
      <PageWrapper>
        <EventDetailView 
          detail={detail} 
          prevEvent={prevEvent} 
          nextEvent={nextEvent} 
        />
      </PageWrapper>
    );
  } catch (err) {
    console.error(`Error loading detail for event ${id}:`, err);
    const message = err instanceof Error ? err.message : `Failed to fetch event ID: ${id}`;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-[4px] border p-6" style={{ borderColor: 'var(--negative)', background: 'var(--negative-dim)' }}>
          <p style={{ color: 'var(--negative)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)', fontWeight: 500 }}>
            Error loading event details
          </p>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            {message}
          </p>
        </div>
      </div>
    );
  }
}
