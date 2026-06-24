'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { EventDetail } from '../lib/types';
import { useIsMobile } from '../hooks/useIsMobile';
import AnimatedChart from './AnimatedChart';

interface ReactionLineChartProps {
  snapshots: EventDetail['snapshots'];
}

export default function ReactionLineChart({ snapshots }: ReactionLineChartProps) {
  const isMobile = useIsMobile();
  const reduce = useReducedMotion();

  const hasSnapshots =
    snapshots &&
    Object.values(snapshots).some((val) => val !== null && val !== undefined);

  if (!hasSnapshots) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[4px] border border-border-subtle bg-bg-surface p-6 text-text-tertiary">
        <p className="font-display italic text-sm">No snapshot chart data available for this event.</p>
      </div>
    );
  }

  const windowKeys = ['T-60', 'T0', 'T+30', 'T+2H', 'T+1D'] as const;

  const chartData = windowKeys.map((window) => {
    const point: { name: string; [key: string]: number | string | null } = {
      name: window,
    };

    (Object.keys(snapshots) as Array<keyof typeof snapshots>).forEach((asset) => {
      const assetSnap = snapshots[asset];
      if (assetSnap && assetSnap[window]) {
        const pctChange = assetSnap[window].pct_change_from_T60;
        point[asset] = pctChange !== null ? parseFloat(pctChange.toFixed(3)) : null;
      } else {
        point[asset] = null;
      }
    });

    return point;
  });

  const assetConfigs: { key: 'NIFTY' | 'USDINR' | 'VIX' | 'GSEC'; name: string; color: string }[] = [
    { key: 'NIFTY', name: 'Nifty 50', color: 'var(--chart-nifty)' },
    { key: 'USDINR', name: 'USD / INR', color: 'var(--chart-usdinr)' },
    { key: 'VIX', name: 'India VIX', color: 'var(--chart-vix)' },
    { key: 'GSEC', name: '10Y G-Sec', color: 'var(--chart-gsec)' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-overlay border border-border-strong p-3 rounded-[4px] shadow-none z-50">
          <p className="font-body text-xs text-text-secondary uppercase tracking-widest mb-2 border-b border-border-subtle pb-1">
            Window: {label}
          </p>
          <div className="space-y-1.5 font-mono text-xs tabular min-w-[140px]">
            {payload.map((entry: any) => {
              const val = entry.value;
              if (val === null || val === undefined) return null;

              const isPos = val > 0.0001;
              const isNeg = val < -0.0001;
              
              let colorClass = 'text-text-secondary';
              if (isPos) colorClass = 'text-[var(--positive)]';
              else if (isNeg) colorClass = 'text-[var(--negative)]';

              const sign = isPos ? '+' : '';
              
              return (
                <div key={entry.name} className="flex items-center justify-between gap-4">
                  <span className="text-text-secondary font-body text-[11px]">{entry.name}</span>
                  <span className={`font-bold ${colorClass}`}>
                    {sign}{val.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartHeight = isMobile ? 220 : 320;

  return (
    <AnimatedChart>
      <div className="h-[220px] md:h-[320px] w-full relative select-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border-subtle)" 
              opacity={0.5} 
              vertical={false} 
            />

            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{
                fill: 'var(--text-tertiary)',
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                letterSpacing: '0.06em'
              }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{
                fill: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11
              }}
              tickFormatter={(value) => {
                if (value === 0) return '0.0%';
                return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
              }}
              domain={['auto', 'auto']}
            />

            <ReferenceLine 
              y={0} 
              stroke="var(--border-strong)" 
              strokeWidth={1.5} 
            />

            {/* Custom Tooltip */}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
            />

            <Legend
              iconType="rect"
              iconSize={10}
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{
                paddingTop: '16px',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
              }}
              formatter={(value) => {
                const config = assetConfigs.find((c) => c.key === value || c.name === value);
                const displayName = config ? config.name : value;
                return (
                  <span className="text-text-secondary hover:text-text-primary uppercase tracking-widest pl-1 select-none">
                    {displayName}
                  </span>
                );
              }}
            />

            {assetConfigs.map((asset) => {
              const hasData = snapshots[asset.key] !== null && snapshots[asset.key] !== undefined;
              if (!hasData) return null;

              return (
                <Line
                  key={asset.key}
                  type="monotone"
                  dataKey={asset.key}
                  name={asset.name}
                  stroke={asset.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 5,
                    stroke: 'var(--text-primary)',
                    strokeWidth: 2
                  }}
                  connectNulls={true}
                  isAnimationActive={!reduce}
                  animationDuration={isMobile ? 500 : 800}
                  animationEasing="ease-out"
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AnimatedChart>
  );
}
