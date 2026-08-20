'use client';

import React from 'react';
import {
  ComposedChart,
  Scatter,
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
import { ScatterPoint } from '@/lib/types';
import AnimatedChart from './AnimatedChart';

interface ScatterChartProps {
  points: ScatterPoint[];
  regression: { slope: number; intercept: number; r_squared: number };
}

const TYPE_COLORS: Record<string, string> = {
  CPI: 'var(--event-cpi)',
  IIP: 'var(--event-iip)',
};

export default function ScatterChart({ points, regression }: ScatterChartProps) {
  const reduce = useReducedMotion();

  const data = points.map((p) => ({
    x: p.surprise_score,
    y: p.reaction_pct,
    type: p.event_id.startsWith('CPI') ? 'CPI' : 'IIP',
    event_id: p.event_id,
    date: p.event_date,
    actual: p.actual,
    consensus: p.consensus,
  }));

  const cpiPoints = data.filter((d) => d.type === 'CPI');
  const iipPoints = data.filter((d) => d.type === 'IIP');

  const xs = data.map((d) => d.x);
  const xMin = xs.length ? Math.min(...xs) : -3;
  const xMax = xs.length ? Math.max(...xs) : 3;
  const regressionData = [
    { x: xMin, y: regression.slope * xMin + regression.intercept },
    { x: xMax, y: regression.slope * xMax + regression.intercept },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-bg-overlay border border-border-strong p-3 rounded-[4px] shadow-none z-50 space-y-1">
          <p className="font-mono text-xs text-text-primary font-bold">{d.event_id}</p>
          <p className="font-body text-[11px] text-text-tertiary uppercase tracking-wider">{d.date}</p>
          <p className="font-mono text-xs text-text-secondary">
            Surprise: <span className="text-text-primary">{d.x.toFixed(2)}σ</span>
          </p>
          <p className="font-mono text-xs text-text-secondary">
            Reaction:{' '}
            <span className={d.y >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}>
              {d.y > 0 ? '+' : ''}
              {d.y.toFixed(2)}%
            </span>
          </p>
          {d.actual != null && d.consensus != null && (
            <p className="font-mono text-[11px] text-text-tertiary">
              Actual {d.actual.toFixed(2)} / Cons. {d.consensus.toFixed(2)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[4px] border border-border-subtle bg-bg-surface p-6 text-text-tertiary">
        <p className="font-display italic text-sm">No scatter data for the selected parameters.</p>
      </div>
    );
  }

  return (
    <AnimatedChart>
      <div className="h-[280px] md:h-[400px] w-full relative select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.5} />
            <XAxis
              dataKey="x"
              type="number"
              domain={['auto', 'auto']}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
              tickFormatter={(v) => `${v.toFixed(1)}σ`}
              label={{
                value: 'Surprise (σ)',
                position: 'insideBottom',
                offset: -2,
                fill: 'var(--text-tertiary)',
                fontSize: 11,
                fontFamily: 'var(--font-body)',
              }}
            />
            <YAxis
              dataKey="y"
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
              domain={['auto', 'auto']}
            />
            <ReferenceLine x={0} stroke="var(--border-strong)" strokeWidth={1.2} />
            <ReferenceLine y={0} stroke="var(--border-strong)" strokeWidth={1.2} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
            <Legend
              iconType="circle"
              iconSize={10}
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ paddingTop: '16px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)' }}
            />
            <Scatter
              name="CPI"
              data={cpiPoints}
              fill={TYPE_COLORS.CPI}
              fillOpacity={0.8}
              isAnimationActive={!reduce}
              animationDuration={reduce ? 0 : 700}
            />
            <Scatter
              name="IIP"
              data={iipPoints}
              fill={TYPE_COLORS.IIP}
              fillOpacity={0.8}
              isAnimationActive={!reduce}
              animationDuration={reduce ? 0 : 700}
            />
            <Line
              name="Regression"
              data={regressionData}
              dataKey="y"
              type="linear"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={!reduce}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </AnimatedChart>
  );
}
