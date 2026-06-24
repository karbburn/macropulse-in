import React from 'react';
import { notFound } from 'next/navigation';
import { fetchEventDetail } from '../../../lib/api';
import EventDetailView from '../../../components/EventDetailView';
import { PageWrapper } from '../../../components/PageWrapper';

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
      <PageWrapper>
        <EventDetailView detail={detail} />
      </PageWrapper>
    );
  } catch (err) {
    console.error(`Error loading detail for event ${id}:`, err);
    const message = err instanceof Error ? err.message : `Failed to fetch event ID: ${id}`;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded border p-6" style={{ borderColor: 'var(--negative)', background: 'var(--negative-dim)' }}>
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
