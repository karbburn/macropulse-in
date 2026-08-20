import { ImageResponse } from 'next/og';

export const alt = 'MacroPulse event';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

export default async function EventOpengraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  let title = id;
  let subtitle = '';
  let surprise = '';
  try {
    const res = await fetch(`${base}/events/${id}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const detail = await res.json();
      const ev = detail?.event ?? {};
      title = ev.outcome ? `${ev.event_type} · ${ev.outcome}` : ev.event_type || id;
      subtitle = ev.date || '';
      if (ev.surprise_score != null) {
        const s = ev.surprise_score;
        surprise = `${s > 0 ? '+' : ''}${s.toFixed(1)}σ surprise`;
      }
    }
  } catch {
    // Fall back to id-only render
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0e0e0e',
          padding: '80px',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: 30, color: '#c49a3c' }}>MacroPulse</div>
          <div style={{ fontSize: 16, color: '#8a8478' }}>— India Edition</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: 54, color: '#f2ede3', lineHeight: 1.1 }}>{title}</div>
          <div style={{ display: 'flex', gap: '32px', fontSize: 26, color: '#a39c8e' }}>
            {subtitle && <div>{subtitle}</div>}
            {surprise && <div style={{ color: '#c49a3c' }}>{surprise}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 20, color: '#6f6a60' }}>
          macropulse-in.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
