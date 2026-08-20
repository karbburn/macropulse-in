import React from 'react';
import { PageWrapper } from '../../components/PageWrapper';

const SECTIONS = [
  {
    title: 'Surprise scoring',
    body: [
      'Every CPI and IIP release carries a consensus estimate. The surprise score measures how far the actual print landed from that consensus, normalized by the historical dispersion of past surprises.',
      'Formally, surprise σ = (actual − consensus) ÷ historical standard deviation of (actual − consensus) for that event type. A score of +1.5σ means the print beat consensus by one and a half historical standard deviations; −1.5σ means it missed by the same margin. MPC decisions carry no numeric consensus and are analysed separately by policy action.',
    ],
  },
  {
    title: 'Reaction windows',
    body: [
      'For each event we capture the cross-asset price path at five checkpoints: T-60 (one hour before the announcement), T0 (the announcement), T+30, T+2H, and T+1D (one trading day later).',
      'The reaction percentage at each window is the move from the T-60 baseline. This isolates the market repricing attributable to the event rather than the prior trend.',
    ],
  },
  {
    title: 'Indexed event study',
    body: [
      'The event study averages price paths across many events of the same kind. Each individual path is scaled to 100 at the Event Day close (T0), then the arithmetic mean is taken across all events.',
      'For MPC, events are grouped by policy action — hike, cut, or hold. For CPI and IIP, they are grouped by surprise direction — above or below consensus. The shaded band is the ±1 standard deviation range around the mean, showing how dispersed individual outcomes are within each group.',
      'Paths use trading days T-2 through T+2 around each event, excluding weekends and market holidays.',
    ],
  },
  {
    title: 'Surprise vs reaction',
    body: [
      'The scatter plots each CPI/IIP print by its consensus surprise (σ) against the subsequent market reaction, with an ordinary-least-squares regression line. A steep, high-R² slope implies markets reprice sharply when prints miss consensus; a flat line implies surprises are already priced in.',
    ],
  },
  {
    title: 'Data sources & limitations',
    body: [
      'Prices are sourced from yfinance (Nifty 50, USD/INR, India VIX, 10Y G-Sec proxy). Macro prints come from RBI press releases and MOSPI, with consensus from curated estimates and Finnhub. Live indicators are cached hourly.',
      'This is an analytical instrument, not investment advice. Indexed paths are descriptive averages; past reactions do not predict future moves. G-Sec uses an ETF proxy and may diverge from the sovereign yield.',
    ],
  },
];

const GLOSSARY = [
  { term: 'Surprise (σ)', def: 'Standardized deviation of an actual print from its consensus estimate.' },
  { term: 'T0', def: 'The event announcement timestamp; the index baseline (100) for event studies.' },
  { term: 'T+1D', def: 'One trading day after the event.' },
  { term: 'Reaction %', def: 'Percentage move in an asset from the T-60 baseline to the chosen window.' },
  { term: 'Confidence band', def: '±1 standard deviation around the mean indexed path.' },
  { term: 'Consensus', def: 'Market or analyst estimate of an upcoming print, used to compute surprise.' },
  { term: 'Indexed path', def: 'A price series rescaled to 100 at T0 so multiple events can be averaged.' },
];

export default function MethodologyPage() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Methodology
          </h1>
          <p className="text-sm text-text-secondary font-body max-w-2xl">
            How MacroPulse turns macro events into comparable, indexed market reactions — and where the
            numbers come from.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <section key={s.title} className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-semibold text-text-primary tracking-tight">
                {s.title}
              </h2>
              <div className="flex flex-col gap-3">
                {s.body.map((p, i) => (
                  <p key={i} className="text-sm text-text-secondary font-body leading-relaxed max-w-[70ch]">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-border-subtle pt-8">
          <h2 className="font-display text-xl font-semibold text-text-primary tracking-tight">Glossary</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="flex flex-col gap-1">
                <dt className="font-mono text-sm text-text-primary font-semibold">{g.term}</dt>
                <dd className="text-sm text-text-secondary font-body leading-relaxed">{g.def}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </PageWrapper>
  );
}
