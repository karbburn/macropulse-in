import React from 'react';
import { fetchEvents } from '../lib/api';
import { MacroEvent } from '../lib/types';
import EventTimeline from '../components/EventTimeline';

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
    const message = err instanceof Error ? err.message : 'Failed to load timeline events';
    errorMsg = message;
  }

  return (
    <div className="bg-background min-h-screen">
      <EventTimeline initialEvents={events} initialError={errorMsg} />
    </div>
  );
}
