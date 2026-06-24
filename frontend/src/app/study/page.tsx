'use client';

import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { PageWrapper } from '../../components/PageWrapper';
import { fetchStudy } from '../../lib/api';
import { EventStudyPath } from '../../lib/types';
import EventStudyChart from '../../components/EventStudyChart';
import { scaleVariants, useSafeVariants } from '../../lib/motion';

export default function StudyPage() {
  const reduce = useReducedMotion();
  const safeScale = useSafeVariants(scaleVariants);

  // States
  const [asset, setAsset] = useState<'NIFTY' | 'USDINR'>('NIFTY');
  const [paths, setPaths] = useState<EventStudyPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unified visibility state for Hike, Cut, Hold series
  const [visibleSeries, setVisibleSeries] = useState({
    hike: true,
    cut: true,
    hold: true,
  });

  // Collapsible methodology section state
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  // Fetch event study data on asset change
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    fetchStudy(asset)
      .then((data) => {
        if (active) {
          setPaths(data.paths);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || 'Failed to load event study data.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [asset]);

  // Find paths
  const hikePath = paths.find((p) => p.decision_type === 'hike');
  const cutPath = paths.find((p) => p.decision_type === 'cut');
  const holdPath = paths.find((p) => p.decision_type === 'hold');

  const counts = {
    hike: hikePath?.event_count ?? 0,
    cut: cutPath?.event_count ?? 0,
    hold: holdPath?.event_count ?? 0,
  };

  // Prepare chart data (days -2 to +2)
  const days = [-2, -1, 0, 1, 2];
  const chartData = days.map((day) => {
    const point: {
      dayVal: number;
      hikeMean: number | null;
      hikeBand: [number, number] | null;
      cutMean: number | null;
      cutBand: [number, number] | null;
      holdMean: number | null;
      holdBand: [number, number] | null;
    } = {
      dayVal: day,
      hikeMean: null,
      hikeBand: null,
      cutMean: null,
      cutBand: null,
      holdMean: null,
      holdBand: null,
    };

    if (hikePath) {
      const idx = hikePath.days.indexOf(day);
      if (idx !== -1) {
        point.hikeMean = parseFloat(hikePath.mean_indexed[idx].toFixed(3));
        point.hikeBand = [
          parseFloat(hikePath.lower_band[idx].toFixed(3)),
          parseFloat(hikePath.upper_band[idx].toFixed(3)),
        ];
      }
    }

    if (cutPath) {
      const idx = cutPath.days.indexOf(day);
      if (idx !== -1) {
        point.cutMean = parseFloat(cutPath.mean_indexed[idx].toFixed(3));
        point.cutBand = [
          parseFloat(cutPath.lower_band[idx].toFixed(3)),
          parseFloat(cutPath.upper_band[idx].toFixed(3)),
        ];
      }
    }

    if (holdPath) {
      const idx = holdPath.days.indexOf(day);
      if (idx !== -1) {
        point.holdMean = parseFloat(holdPath.mean_indexed[idx].toFixed(3));
        point.holdBand = [
          parseFloat(holdPath.lower_band[idx].toFixed(3)),
          parseFloat(holdPath.upper_band[idx].toFixed(3)),
        ];
      }
    }

    return point;
  });

  // Calculate Avg T+1D return for each path (indexed_value_at_T1 - 100)
  const calculateT1DReturn = (path: EventStudyPath | undefined) => {
    if (!path) return null;
    const idxOfTPlus1 = path.days.indexOf(1);
    if (idxOfTPlus1 === -1) return null;
    return path.mean_indexed[idxOfTPlus1] - 100;
  };

  const hikeReturn = calculateT1DReturn(hikePath);
  const cutReturn = calculateT1DReturn(cutPath);
  const holdReturn = calculateT1DReturn(holdPath);

  const formatReturn = (val: number | null) => {
    if (val === null) return '—';
    const formatted = val.toFixed(2);
    return val > 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const getReturnColorClass = (val: number | null) => {
    if (val === null) return 'text-text-tertiary';
    if (val > 0.001) return 'text-[var(--positive)]';
    if (val < -0.001) return 'text-[var(--negative)]';
    return 'text-text-secondary';
  };

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6 md:gap-8">
        
        {/* Page Header */}
        <div className="flex flex-col gap-2 text-left">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            RBI MPC Decisions <span className="text-[var(--accent-primary)] font-display italic">Event Study</span>
          </h1>
          <p className="text-sm text-text-secondary max-w-xl font-body">
            Analyze the average indexed market path (indexed to 100 on Event Day T0) from T-2 to T+2 trading days for hikes, cuts, and holds.
          </p>
        </div>

        {/* STEP 1: Asset + Decision Type Toggle Controls */}
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-border-subtle pb-6 mt-2">
          {/* Asset Selection */}
          <div className="flex flex-col gap-2">
            <span className="font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase select-none">
              Asset
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setAsset('NIFTY')}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors select-none cursor-pointer ${
                  asset === 'NIFTY'
                    ? 'bg-[var(--accent-primary)] text-text-inverse'
                    : 'border border-border-strong text-text-secondary hover:text-text-primary hover:border-border-strong'
                }`}
              >
                Nifty 50
              </button>
              <button
                onClick={() => setAsset('USDINR')}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors select-none cursor-pointer ${
                  asset === 'USDINR'
                    ? 'bg-[var(--accent-primary)] text-text-inverse'
                    : 'border border-border-strong text-text-secondary hover:text-text-primary hover:border-border-strong'
                }`}
              >
                USD / INR
              </button>
            </div>
          </div>

          {/* Series Visibility Toggles */}
          <div className="flex flex-col gap-2">
            <span className="font-body text-xs font-semibold tracking-widest text-text-tertiary uppercase select-none">
              Decision
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setVisibleSeries((prev) => ({ ...prev, hike: !prev.hike }))}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors select-none cursor-pointer ${
                  visibleSeries.hike
                    ? 'bg-[var(--chart-hike)] text-text-inverse font-bold'
                    : 'border border-border-strong text-text-secondary hover:text-text-primary'
                }`}
              >
                Hike
              </button>
              <button
                onClick={() => setVisibleSeries((prev) => ({ ...prev, cut: !prev.cut }))}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors select-none cursor-pointer ${
                  visibleSeries.cut
                    ? 'bg-[var(--chart-cut)] text-text-inverse font-bold'
                    : 'border border-border-strong text-text-secondary hover:text-text-primary'
                }`}
              >
                Cut
              </button>
              <button
                onClick={() => setVisibleSeries((prev) => ({ ...prev, hold: !prev.hold }))}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors select-none cursor-pointer ${
                  visibleSeries.hold
                    ? 'bg-[var(--chart-hold)] text-text-inverse font-bold'
                    : 'border border-border-strong text-text-secondary hover:text-text-primary'
                }`}
              >
                Hold
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-[4px] border border-border-strong p-6 text-center" style={{ borderColor: 'var(--negative)', background: 'var(--negative-dim)' }}>
            <p className="text-[var(--negative)] font-semibold font-body">Failed to load study data</p>
            <p className="text-text-secondary text-sm mt-1">{error}</p>
          </div>
        )}

        {/* STEP 2: Main Event Study Chart */}
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
              data={chartData}
              visibleSeries={visibleSeries}
              setVisibleSeries={setVisibleSeries}
              counts={counts}
            />
          </div>
        )}

        {/* STEP 3: Stat Cards Below Chart */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
            {/* Hike Card */}
            <motion.div
              variants={safeScale}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className={`rounded-[4px] border border-border-subtle bg-bg-surface p-5 flex flex-col justify-between h-[120px] hover:border-border-strong transition-all duration-300 ${
                visibleSeries.hike ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold tracking-wider text-[var(--chart-hike)] uppercase">
                  Rate Hike Averages
                </span>
                <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">
                  N = {counts.hike}
                </span>
              </div>
              <span className={`font-mono text-3xl font-bold tracking-tight tabular-nums leading-none ${getReturnColorClass(hikeReturn)}`}>
                {formatReturn(hikeReturn)}
              </span>
              <span className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">
                Average T+1D Return
              </span>
            </motion.div>

            {/* Cut Card */}
            <motion.div
              variants={safeScale}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className={`rounded-[4px] border border-border-subtle bg-bg-surface p-5 flex flex-col justify-between h-[120px] hover:border-border-strong transition-all duration-300 ${
                visibleSeries.cut ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold tracking-wider text-[var(--chart-cut)] uppercase">
                  Rate Cut Averages
                </span>
                <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">
                  N = {counts.cut}
                </span>
              </div>
              <span className={`font-mono text-3xl font-bold tracking-tight tabular-nums leading-none ${getReturnColorClass(cutReturn)}`}>
                {formatReturn(cutReturn)}
              </span>
              <span className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">
                Average T+1D Return
              </span>
            </motion.div>

            {/* Hold Card */}
            <motion.div
              variants={safeScale}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className={`rounded-[4px] border border-border-subtle bg-bg-surface p-5 flex flex-col justify-between h-[120px] hover:border-border-strong transition-all duration-300 ${
                visibleSeries.hold ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-body text-xs font-semibold tracking-wider text-[var(--chart-hold)] uppercase">
                  Policy Hold Averages
                </span>
                <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider">
                  N = {counts.hold}
                </span>
              </div>
              <span className={`font-mono text-3xl font-bold tracking-tight tabular-nums leading-none ${getReturnColorClass(holdReturn)}`}>
                {formatReturn(holdReturn)}
              </span>
              <span className="font-body text-[10px] text-text-tertiary uppercase tracking-wider">
                Average T+1D Return
              </span>
            </motion.div>
          </div>
        )}

        {/* STEP 4: Collapsible Methodology Note */}
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
            animate={reduce ? { height: 'auto', opacity: 1 } : {
              height: isMethodologyOpen ? 'auto' : 0,
              opacity: isMethodologyOpen ? 1 : 0,
            }}
            transition={{ duration: reduce ? 0 : 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="pt-4 text-sm text-text-secondary font-body leading-relaxed max-w-[75ch] space-y-4">
              <p>
                An <strong>Event Study</strong> isolates the impact of a specific recurring event type on asset prices.
                We track the price behavior of the selected asset surrounding all historical RBI Monetary Policy Committee decisions since 2018.
              </p>
              <p>
                <strong>1. Price Indexation:</strong> For each individual policy decision, the price path is scaled to 100 on the close of the Event Day (T0). Trading days are represented as T-2 to T+2, excluding market holidays and weekends.
              </p>
              <p>
                <strong>2. Path Aggregation:</strong> The thick colored lines plot the arithmetic mean of these indexed paths, grouped by policy decision (Rate Hike, Rate Cut, or Policy Hold).
              </p>
              <p>
                <strong>3. Shaded Confidence Bands:</strong> The low-opacity bands represent the ±1 standard deviation range around the mean, demonstrating the volatility and historical dispersion of individual outcomes within each decision group.
              </p>
            </div>
          </motion.div>
        </div>

      </div>
    </PageWrapper>
  );
}
