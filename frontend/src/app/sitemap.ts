import type { MetadataRoute } from 'next';
import { fetchEvents } from '@/lib/api';

const BASE_URL = 'https://macropulse-in.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/study',
    '/scatter',
    '/report',
    '/methodology',
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    const data = await fetchEvents('all', undefined, undefined, 500);
    eventRoutes = data.events.map((e) => ({
      url: `${BASE_URL}/events/${e.id}`,
      lastModified: new Date(e.date),
      changeFrequency: 'yearly',
      priority: 0.5,
    }));
  } catch {
    // Sitemap still returns static routes if the API is unreachable
  }

  return [...staticRoutes, ...eventRoutes];
}
