'use client';

import { useRates } from '@/components/RatesProvider';

const fmtRepo = (val: number | null) => (val != null ? `${val.toFixed(2)}%` : '—');
const fmtPct = (val: number | null) => (val != null ? `${val}%` : '—');

export default function TickerStrip() {
  const { rates, isLoading } = useRates();

  const niftyLabel =
    rates?.nifty_price != null
      ? `${rates.nifty_price.toLocaleString('en-IN')}${
          rates.nifty_change_pct != null
            ? ` (${rates.nifty_change_pct > 0 ? '+' : ''}${rates.nifty_change_pct}%)`
            : ''
        }`
      : isLoading
        ? '···'
        : '—';

  const asOf = rates?.as_of ? ` · as of ${rates.as_of}` : '';

  const segment = (
    <span className="shrink-0 flex items-center gap-4">
      RBI REPO: {fmtRepo(rates?.repo_rate ?? null)}
      <span className="text-text-tertiary font-body">•</span>
      CPI: {fmtPct(rates?.cpi_actual ?? null)}
      <span className="text-text-tertiary font-body">•</span>
      IIP: {fmtPct(rates?.iip_actual ?? null)}
      <span className="text-text-tertiary font-body">•</span>
      NIFTY: {niftyLabel}
      <span className="text-text-tertiary font-body">{asOf}</span>
    </span>
  );

  return (
    <div className="hidden md:block overflow-hidden relative font-mono text-xs text-text-secondary select-none max-w-[450px]">
      <div className="ticker-track flex items-center gap-16 whitespace-nowrap">
        {segment}
        <span className="shrink-0 flex items-center gap-4" aria-hidden="true">
          RBI REPO: {fmtRepo(rates?.repo_rate ?? null)}
          <span className="text-text-tertiary font-body">•</span>
          CPI: {fmtPct(rates?.cpi_actual ?? null)}
          <span className="text-text-tertiary font-body">•</span>
          IIP: {fmtPct(rates?.iip_actual ?? null)}
          <span className="text-text-tertiary font-body">•</span>
          NIFTY: {niftyLabel}
          <span className="text-text-tertiary font-body">{asOf}</span>
        </span>
      </div>
    </div>
  );
}
