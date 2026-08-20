'use client';

import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { PageWrapper } from '../../components/PageWrapper';
import { fetchStudy } from '../../lib/api';
import { EventStudyPath } from '../../lib/types';
import EventStudyChart, { StudySeries } from '../../components/EventStudyChart';
import { scaleVariants, useSafeVariants } from '../../lib/motion';

const ASSETS = ['NIFTY', 'USDINR', 'VIX', 'GSEC'] as const;
const EVENT_TYPES = ['MPC', 'CPI', 'IIP'] as const;

const TYPE_META: Record<string, { title: string; subtitle: string }> = {
  MPC: {
    title: 'RBI MPC Decisions',
    subtitle:
      'Average indexed market path (indexed to 100 on Event Day T0) from T-2 to T+2 trading days, grouped by policy action.',
  },
  CPI: {
    title: 'CPI Inflation Prints',
    subtitle:
      'Average indexed market path around CPI releases, grouped by whether the print landed above or below consensus.',
  },
  IIP: {
    title: 'IIP Production Prints',
    subtitle:
      'Average indexed market path around IIP releases, grouped by whether the print landed above or below consensus.',
  },
};

const LABELS: Record<string, string> = {
  hike: 'Rate Hike',
  cut: 'Rate Cut',
  hold: 'Policy Hold',
  above: 'Above Consensus',
  below: 'Below Consensus',
};

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
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function t1dReturn(path: EventStudyPath): number | null {
  const idx = path.days.indexOf(1);
  if (idx === -1 || path.mean_indexed[idx] == null) return null;
  return path.mean_indexed[idx] - 100;
}

const fmtReturn = (val: number | null) => {
  if (val === null) return '-';
  const f = val.toFixed(2);
  return val > 0 ? `+${f}%` : `${f}%`;
};

const returnColor = (val: number | null) => {
  if (val === null) return 'text-text-tertiary';
  if (val > 0.001) return 'text-[var(--positive)]';
  if (val < -0.001) return 'text-[var(--negative)]';
  return 'text-text-secondary';
};

export default function StudyPage() {
  const reduce = useReducedMotion();
  const safeScale = useSafeVariants(scaleVariants);

  const [asset, setAsset] = useState<(typeof ASSETS)[number]>('NIFTY');
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number]>('MPC');
  const [paths, setPaths] = useState<EventStudyPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    fetchStudy(asset, eventType)
      .then((data) => {
        if (!active) return;
        setPaths(data.paths);
        setVisibleSeries(
          Object.fromEntries(data.paths.map((p) => [p.decision_type, true]))
        );
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Failed to load event study data.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [asset, eventType]);

  const series: StudySeries[] = paths.map((p) => ({
    key: p.decision_type,
    label: LABELS[p.decision_type] ?? p.decision_type,
    color: '',
    days: p.days,
    mean: p.mean_indexed,
    upper: p.upper_band,
    lower: p.lower_band,
    count: p.event_count,
  }));

  const days = [-2, -1, 0, 1, 2];
  const meta = TYPE_META[eventType];

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-2 text-left">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            {meta.title} <span className="text-[var(--accent-primary)] font-display italic">Event Study</span>
          </h1>
          <p className="text-sm text-text-secondary max-w-xl font-body">{meta.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border-subtle pb-6 mt-2">
          <ToggleGroup label="Asset" options={ASSETS} value={asset} onChange={setAsset} />
          <ToggleGroup label="Event Type" options={EVENT_TYPES} value={eventType} onChange={setEventType} />
        </div>

        {error && (
          <div
            className="rounded-[4px] border p-6 text-center"
            style={{ borderColor: 'var(--negative)', background: 'var(--negative-dim)' }}
          >
            <p className="text-[var(--negative)] font-semibold font-body">Failed to load study data</p>
            <p className="text-text-secondary text-sm mt-1">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-[320px] md:h-[400px] flex-col items-center justify-center rounded-[4px] border border-border-subtle bg-bg-surface p-6 text-text-secondary">
            <div className="spinner h-8 w-8 mb-4"></div>
            <p className="font-body text-sm tracking-wider uppercase text-text-tertiary animate-pulse">
              Computing event study averages...
            </p>
          </div>
        ) : (
          <div className="rounded-[4px] border border-border-subtle bg-bg-surface p-5 md:p-6 hover:border-border-strong transition-colors">
            <EventStudyChart
              days={days}
              series={series}
              visibleSeries={visibleSeries}
              onToggle={(key) =>
                setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }))
              }
            />
          </div>
        )}

        {!isLoading && paths.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
            {series.map((s) => {
              const path = paths.find((p) => p.decision_type === s.key)!;
              const ret = t1dReturn(path);
              return (
                <motion.div
                  key={s.key}
                  variants={safeScale}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-60px' }}
                  className={`rounded-[4px] border border-border-subtle bg-bg-surface p-5 flex flex-col justify-between h-[120px] hover:border-border-strong transition-all duration-300 ${
                    visibleSeries[s.key] === false ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs font-semibold tracking-wider text-text-tertiary uppercase">
                      {s.label}
                    </span>
                    <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">
                      N = {s.count}
                    </span>
                  </div>
                  <span className={`font-mono text-3xl font-bold tracking-tight tabular-nums leading-none ${returnColor(ret)}`}>
                    {fmtReturn(ret)}
                  </span>
                  <span className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">
                    Average T+1D Return
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="border-t border-border-subtle pt-6 mt-4">
          <button
            onClick={() => setIsMethodologyOpen(!isMethodologyOpen)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-[var(--accent-primary)] transition-colors select-none font-body uppercase tracking-widest cursor-pointer group"
          >
            <span>How this study is computed</span>
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
                An <strong>Event Study</strong> isolates the impact of a recurring event type on asset prices. We
                track the price path of the selected asset across all historical {meta.title.toLowerCase()} since 2018.
              </p>
              <p>
                <strong>1. Price Indexation:</strong> For each event, the price path is scaled to 100 on the close of
                the Event Day (T0). Trading days are represented as T-2 to T+2, excluding market holidays and weekends.
              </p>
              <p>
                <strong>2. Path Aggregation:</strong> The colored lines plot the arithmetic mean of these indexed
                paths, grouped by {eventType === 'MPC' ? 'policy decision' : 'surprise direction'}.
              </p>
              <p>
                <strong>3. Shaded Bands:</strong> The low-opacity bands represent the ±1 standard deviation range
                around the mean, showing the historical dispersion of individual outcomes within each group.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}
