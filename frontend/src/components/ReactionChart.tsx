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
import { EventDetail } from '../lib/types';

interface ReactionChartProps {
  snapshots: EventDetail['snapshots'];
}

export default function ReactionChart({ snapshots }: ReactionChartProps) {
  // Check if we have at least some snapshot data
  const hasSnapshots =
    snapshots &&
    Object.values(snapshots).some((val) => val !== null && val !== undefined);

  if (!hasSnapshots) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-neutral-800 bg-[#222222] p-6 text-neutral-500">
        <p>No snapshot chart data available for this event.</p>
      </div>
    );
  }

  // Windows in order
  const windowKeys = ['T-60', 'T0', 'T+30', 'T+2H', 'T+1D'] as const;

  // Prepare data for Recharts
  const data = windowKeys.map((window) => {
    const point: { name: string; [key: string]: number | string | null } = {
      name: window,
    };

    // Populate each asset's percentage change
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
    { key: 'NIFTY', name: 'Nifty 50', color: '#f59e0b' },      // Brand Amber
    { key: 'USDINR', name: 'USD / INR', color: '#06b6d4' },    // Cyan
    { key: 'VIX', name: 'India VIX', color: '#f43f5e' },       // Rose
    { key: 'GSEC', name: '10Y G-Sec Proxy', color: '#6366f1' }, // Indigo
  ];

  return (
    <div className="rounded-xl border border-neutral-800 bg-[#222222] p-5 shadow-lg">
      <div className="mb-4">
        <h3 className="font-serif text-lg font-bold text-white">Market Reaction Path</h3>
        <p className="text-xs text-neutral-400">Percentage change relative to the T-60 baseline (1 hour prior to announcement)</p>
      </div>

      <div className="h-[350px] w-full font-mono text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              tickLine={false}
              axisLine={{ stroke: '#3f3f46' }}
            />
            <YAxis
              stroke="#9ca3af"
              tickLine={false}
              axisLine={{ stroke: '#3f3f46' }}
              tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}%`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f1f1f',
                borderColor: '#3e3e3e',
                borderRadius: '8px',
                color: '#e5e7eb',
              }}
              formatter={(value: unknown) => {
                if (value === null || value === undefined) return ['—', ''];
                const numVal = Number(value);
                if (isNaN(numVal)) return [String(value), ''];
                return [`${numVal > 0 ? '+' : ''}${numVal.toFixed(3)}%`, ''];
              }}
              labelClassName="font-bold text-brand-amber font-mono"
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ paddingTop: '15px' }}
            />
            {/* Announcement line at T0 */}
            <ReferenceLine
              x="T0"
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{
                value: 'Announcement',
                position: 'top',
                fill: '#ef4444',
                fontSize: 10,
                fontFamily: 'monospace',
                offset: 10
              }}
            />
            {assetConfigs.map((asset) => {
              // Only draw lines if we have data for this asset in the snapshot
              const hasData = snapshots[asset.key] !== null;
              if (!hasData) return null;

              return (
                <Line
                  key={asset.key}
                  type="monotone"
                  dataKey={asset.key}
                  name={asset.name}
                  stroke={asset.color}
                  strokeWidth={2.5}
                  dot={{ r: 4, stroke: asset.color, strokeWidth: 1, fill: '#1a1a1a' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  connectNulls={true}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
