'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { PageWrapper } from '../../components/PageWrapper';
import { fetchScatter } from '../../lib/api';
import { ScatterResponse } from '../../lib/types';
import { scaleVariants, useSafeVariants } from '../../lib/motion';

const ScatterChart = dynamic(() => import('../../components/ScatterChart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center md:h-[400px] text-text-tertiary font-body text-xs uppercase tracking-widest">
      Loading chart…
    </div>
  ),
});

const ASSETS = ['NIFTY', 'USDINR', 'VIX', 'GSEC'] as const;
const EVENT_TYPES = ['all', 'CPI', 'IIP'] as const;
const WINDOWS = ['T+30', 'T+2H', 'T+1D'] as const;

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase select-none">
        {label}
      </span>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-[4px] px-5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors select-none cursor-pointer ${
              value === opt
                ? 'bg-[var(--accent-primary)] text-text-inverse'
                : 'border border-border-strong text-text-secondary hover:text-text-primary hover:border-border-strong'
            }`}
          >
            {opt === 'all' ? 'All' : opt.replace('T+', 'T+').replace('T-', 'T-')}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ScatterPage() {
  const reduce = useReducedMotion();
  const safeScale = useSafeVariants(scaleVariants);

  const [asset, setAsset] = useState<(typeof ASSETS)[number]>('NIFTY');
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number]>('all');
  const [window, setWindow] = useState<(typeof WINDOWS)[number]>('T+2H');
  const [data, setData] = useState<ScatterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    fetchScatter(asset, eventType, window)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Failed to load scatter data.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [asset, eventType, window]);

  const slope = data?.regression.slope ?? 0;
  const r2 = data?.regression.r_squared ?? 0;
  const n = data?.points.length ?? 0;
  const pValue = data?.regression.p_value ?? null;

  const formatP = (p: number | null) => {
    if (p === null || p === undefined) return '—';
    if (p < 0.001) return '<0.001';
    return p.toFixed(3);
  };

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-2 text-left">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Surprise vs Reaction <span className="text-[var(--accent-primary)] font-display italic">Scatter</span>
          </h1>
          <p className="text-sm text-text-secondary max-w-xl font-body">
            Each point is a macro print plotted by its consensus surprise (σ) against the subsequent market
            reaction. The dashed line is the ordinary-least-squares fit across all events.
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border-subtle pb-6 mt-2">
          <ToggleGroup label="Asset" options={ASSETS} value={asset} onChange={setAsset} />
          <ToggleGroup label="Event Type" options={EVENT_TYPES} value={eventType} onChange={setEventType} />
          <ToggleGroup label="Window" options={WINDOWS} value={window} onChange={setWindow} />
        </div>

        {error && (
          <div
            className="rounded-[4px] border p-6 text-center"
            style={{ borderColor: 'var(--negative)', background: 'var(--negative-dim)' }}
          >
            <p className="text-[var(--negative)] font-semibold font-body">Failed to load scatter data</p>
            <p className="text-text-secondary text-sm mt-1">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-[320px] md:h-[400px] flex-col items-center justify-center rounded-[4px] border border-border-subtle bg-bg-surface p-6 text-text-secondary">
            <div className="spinner h-8 w-8 mb-4"></div>
            <p className="font-body text-sm tracking-wider uppercase text-text-tertiary animate-pulse">
              Computing regression...
            </p>
          </div>
        ) : (
          <div className="rounded-[4px] border border-border-subtle bg-bg-surface p-5 md:p-6 hover:border-border-strong transition-colors">
            <ScatterChart points={data?.points ?? []} regression={data?.regression ?? { slope: 0, intercept: 0, r_squared: 0, p_value: null, n: 0 }} />
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 w-full">
            <motion.div
              variants={safeScale}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="rounded-[4px] border border-border-subtle bg-bg-surface p-5 flex flex-col justify-between h-[120px] hover:border-border-strong transition-all duration-300"
            >
              <span className="font-body text-xs font-semibold tracking-wider text-[var(--accent-primary)] uppercase">
                Slope
              </span>
              <span className="font-mono text-3xl font-bold tracking-tight tabular-nums leading-none text-text-primary">
                {slope > 0 ? '+' : ''}
                {slope.toFixed(2)}
              </span>
              <span className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">
                % reaction per σ
              </span>
            </motion.div>

            <motion.div
              variants={safeScale}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="rounded-[4px] border border-border-subtle bg-bg-surface p-5 flex flex-col justify-between h-[120px] hover:border-border-strong transition-all duration-300"
            >
              <span className="font-body text-xs font-semibold tracking-wider text-[var(--accent-primary)] uppercase">
                R²
              </span>
              <span className="font-mono text-3xl font-bold tracking-tight tabular-nums leading-none text-text-primary">
                {r2.toFixed(2)}
              </span>
              <span className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">
                Goodness of fit
              </span>
            </motion.div>

            <motion.div
              variants={safeScale}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="rounded-[4px] border border-border-subtle bg-bg-surface p-5 flex flex-col justify-between h-[120px] hover:border-border-strong transition-all duration-300"
            >
              <span className="font-body text-xs font-semibold tracking-wider text-[var(--accent-primary)] uppercase">
                Sample
              </span>
              <span className="font-mono text-3xl font-bold tracking-tight tabular-nums leading-none text-text-primary">
                {n}
              </span>
              <span className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">
                Events plotted
              </span>
            </motion.div>

            <motion.div
              variants={safeScale}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="rounded-[4px] border border-border-subtle bg-bg-surface p-5 flex flex-col justify-between h-[120px] hover:border-border-strong transition-all duration-300"
            >
              <span className="font-body text-xs font-semibold tracking-wider text-[var(--accent-primary)] uppercase">
                p-value
              </span>
              <span className="font-mono text-3xl font-bold tracking-tight tabular-nums leading-none text-text-primary">
                {formatP(pValue)}
              </span>
              <span className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">
                Slope significance
              </span>
            </motion.div>
          </div>
        )}

        <div className="border-t border-border-subtle pt-6 mt-4">
          <button
            onClick={() => setIsMethodologyOpen(!isMethodologyOpen)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-[var(--accent-primary)] transition-colors select-none font-body uppercase tracking-widest cursor-pointer group"
          >
            <span>How this is computed</span>
            <ChevronDown
              size={14}
              className={`transform transition-transform duration-200 text-text-tertiary group-hover:text-text-primary ${
                isMethodologyOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <motion.div
            layout
            initial={{ height: 0, opacity: 0 }}
            animate={reduce ? { height: 'auto', opacity: 1 } : { height: isMethodologyOpen ? 'auto' : 0, opacity: isMethodologyOpen ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="pt-4 text-sm text-text-secondary font-body leading-relaxed max-w-[75ch] space-y-4">
              <p>
                Every CPI and IIP release carries a <strong>consensus surprise</strong> — how far the actual print landed from
                the market consensus, normalized by the historical standard deviation of past surprises (measured in σ).
              </p>
              <p>
                <strong>X-axis:</strong> the surprise score (σ). <strong>Y-axis:</strong> the market reaction — the percentage
                move in the selected asset from T-60 minutes to the chosen window.
              </p>
              <p>
                <strong>Regression line:</strong> an OLS fit of reaction on surprise. A steep, high-R² slope implies markets
                reprice sharply when prints miss consensus; a flat line implies surprises are already priced in.
              </p>
              <p className="text-text-tertiary">
                MPC decisions are excluded — they carry no numeric consensus surprise and are analysed separately on the
                Event Study page.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}
