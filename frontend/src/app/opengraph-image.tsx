import { ImageResponse } from 'next/og';

export const alt = 'MacroPulse — India Edition';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
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
          <div style={{ fontSize: 34, color: '#c49a3c', letterSpacing: '-0.02em' }}>MacroPulse</div>
          <div style={{ fontSize: 18, color: '#8a8478' }}>— India Edition</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: 52, color: '#f2ede3', lineHeight: 1.1, maxWidth: 900 }}>
            Event-impact analytics for Indian macro markets.
          </div>
          <div style={{ fontSize: 24, color: '#a39c8e' }}>
            RBI MPC · CPI · IIP — surprise, reaction, attribution.
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
