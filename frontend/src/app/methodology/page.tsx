import React from 'react';
import { PageWrapper } from '../../components/PageWrapper';

const SECTIONS = [
  {
    title: 'Surprise scoring',
    body: [
      'Every CPI and IIP release has a consensus estimate — the market\'s best guess for the number before it is published. The surprise score measures how far the actual print landed from that consensus.',
      'To make surprises comparable across months (when the usual miss size changes), we standardize: surprise σ = (actual − consensus) ÷ the historical standard deviation of past misses for that event type. A reading of +1.5σ means the print beat consensus by one and a half historical standard deviations; −1.5σ means it missed by the same margin. MPC decisions have no single numeric consensus, so they are analysed separately by policy action (hike, cut, hold).',
    ],
  },
  {
    title: 'Reaction windows',
    body: [
      'For each event we capture the cross-asset price path at five checkpoints: T-60 (one hour before the announcement), T0 (the announcement), T+30, T+2H, and T+1D (one trading day later). The reaction at each window is the percentage move from the T-60 baseline.',
      'For very recent events (roughly the last two months) we use intraday prices, so T-60, T0, T+30 and T+2H are genuinely distinct moments. For everything older, only daily data is available from the price source, so those four windows all fall on the same daily close — in that case the "reaction" is effectively the move from the prior trading day\'s close to the event day\'s close. This is flagged per asset on every event page.',
    ],
  },
  {
    title: 'Indexed event study',
    body: [
      'The event study averages price paths across many events of the same kind. Each individual path is scaled to 100 at the event-day close (T0), then we take the arithmetic mean across all events. Scaling to 100 lets paths from different periods sit on a common footing.',
      'For MPC, events are grouped by policy action — hike, cut, or hold. For CPI and IIP, they are grouped by surprise direction — above or below consensus. The shaded band is the ±1 standard-deviation spread of the individual paths around the mean, showing how dispersed outcomes are within each group (not a confidence interval for the mean).',
      'Paths use trading days T-2 through T+2 around each event, skipping weekends and market holidays. All events are weighted equally.',
    ],
  },
  {
    title: 'Surprise vs reaction',
    body: [
      'The scatter plots each CPI/IIP print by its consensus surprise (σ) against the subsequent market reaction, with an ordinary-least-squares (OLS) regression line through the points. A steep, high-R² slope implies markets reprice sharply when prints miss consensus; a flat line implies surprises are largely already priced in.',
      'Alongside the slope and R² we report the sample size (N) and the regression\'s p-value, so you can tell a real relationship from one that could be noise. We analyse CPI and IIP separately by default because their surprises are measured on different bases.',
    ],
  },
  {
    title: 'A worked example',
    body: [
      'Suppose the consensus for a CPI print is 5.00% and the actual comes in at 5.40%. The raw miss is +0.40pp. If the historical standard deviation of CPI misses has been 0.25pp, the surprise is +0.40 ÷ 0.25 = +1.6σ — a clear upside surprise.',
      'If Nifty 50 then falls 0.8% from T-60 to T+2H, that point lands at x = +1.6σ, y = −0.8% on the scatter. Over many such events the regression line shows whether big surprises tend to produce big moves in a consistent direction.',
    ],
  },
  {
    title: 'Data sources & important caveats',
    body: [
      'Prices come from a public market-data provider (Nifty 50, USD/INR, India VIX, and a gilt-fund proxy for the 10-year sovereign). Macro prints come from RBI press releases and MOSPI, with consensus from curated estimates and a market-data API. Live indicators are cached hourly.',
      'The 10-year sovereign is represented by a gilt mutual fund (SBI Magnum Gilt). A gilt fund\'s value moves with bond prices, which move inversely to yields — so a positive "G-Sec" move means bond prices rose (yields fell), the opposite direction to a yield chart. It also carries small daily coupon accrual and fund-level frictions, so treat it as a directional proxy, not a precise yield.',
      'These are raw indexed returns, not "abnormal returns" stripped of broad market moves, so part of any path reflects the market\'s general direction rather than the event alone. Indexed paths and regressions are descriptive averages; past reactions do not predict future moves. This is an analytical instrument, not investment advice.',
    ],
  },
];

const GLOSSARY = [
  { term: 'Surprise (σ)', def: 'How far an actual print landed from consensus, scaled by the historical size of past misses.' },
  { term: 'T0', def: 'The event announcement; the index baseline (100) for event studies.' },
  { term: 'T+1D', def: 'One trading day after the event.' },
  { term: 'Reaction %', def: 'Percentage move in an asset from the T-60 baseline to the chosen window.' },
  { term: 'Dispersion band', def: '±1 standard deviation of the individual paths around the mean, showing outcome spread.' },
  { term: 'Consensus', def: 'Market or analyst estimate of an upcoming print, used to compute the surprise.' },
  { term: 'Indexed path', def: 'A price series rescaled to 100 at T0 so multiple events can be averaged.' },
  { term: 'Resolution', def: 'Intraday (distinct moments) or daily (one close per day) price data used for a window.' },
  { term: 'Gilt-fund proxy', def: 'A government-bond mutual fund used as a directional stand-in for the 10Y sovereign yield.' },
  { term: 'R² / p-value', def: 'R² is how much reaction variance the surprise explains; the p-value says if the slope is distinguishable from zero.' },
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
            How MacroPulse turns macro events into comparable, indexed market reactions — written for
            readers who are not statisticians, with the caveats that matter.
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
