import { MacroEvent, EventDetail, ScatterResponse, EventStudyPath } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function wakeBackend(): Promise<void> {
  const MAX_RETRIES = 10;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await fetch(`${BASE_URL}/health`, { cache: 'no-store' });
      if (res.ok) return;
    } catch {
      // Expected during cold start — retry silently
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Backend unavailable');
}

export async function fetchEvents(
  eventType: string = 'all',
  fromDate?: string,
  toDate?: string,
  limit: number = 100
): Promise<{ events: MacroEvent[]; total: number }> {
  const params = new URLSearchParams();
  params.set('event_type', eventType);
  params.set('limit', limit.toString());
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);

  const res = await fetch(`${BASE_URL}/events?${params.toString()}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchEventDetail(eventId: string): Promise<EventDetail> {
  const res = await fetch(`${BASE_URL}/events/${eventId}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch event detail for ${eventId}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchScatter(
  asset: string,
  eventType: string = 'all',
  window: string = 'T+2H'
): Promise<ScatterResponse> {
  const params = new URLSearchParams();
  params.set('asset', asset);
  params.set('event_type', eventType);
  params.set('window', window);

  const res = await fetch(`${BASE_URL}/scatter?${params.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch scatter: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStudy(asset: string): Promise<{ paths: EventStudyPath[] }> {
  const res = await fetch(`${BASE_URL}/study?asset=${asset}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch study: ${res.statusText}`);
  }
  return res.json();
}
