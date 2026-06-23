import React from 'react';
import { notFound } from 'next/navigation';
import { fetchEventDetail } from '../../../lib/api';
import EventDetailView from '../../../components/EventDetailView';

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
    return (
      <div className="bg-background min-h-screen">
        <EventDetailView detail={detail} />
      </div>
    );
  } catch (err: any) {
    console.error(`Error loading detail for event ${id}:`, err);
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6">
          <p className="text-red-400 font-medium text-lg">Error loading event details</p>
          <p className="text-neutral-500 text-sm mt-1">{err?.message || `Failed to fetch event ID: ${id}`}</p>
        </div>
      </div>
    );
  }
}
