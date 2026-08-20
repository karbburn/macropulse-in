'use client';

import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { useIsMobile } from '../hooks/useIsMobile';
import AnimatedChart from './AnimatedChart';

export interface StudySeries {
  key: string;
  label: string;
  color: string;
  days: number[];
  mean: number[];
  upper: number[];
  lower: number[];
  count: number;
}

interface EventStudyChartProps {
  days: number[];
  series: StudySeries[];
  visibleSeries: Record<string, boolean>;
  onToggle: (key: string) => void;
}

const DECISION_COLORS: Record<string, string> = {
  hike: 'var(--chart-hike)',
  cut: 'var(--chart-cut)',
  hold: 'var(--chart-hold)',
  above: 'var(--positive)',
  below: 'var(--negative)',
};

export default function EventStudyChart({
  days,
  series,
  visibleSeries,
  onToggle,
}: EventStudyChartProps) {
  const isMobile = useIsMobile();
  const reduce = useReducedMotion();

  const colorFor = (key: string) => DECISION_COLORS[key] ?? 'var(--accent-primary)';

  const data = days.map((day) => {
    const point: { dayVal: number; [k: string]: number | null | [number, number] | null } = { dayVal: day };
    series.forEach((s) => {
      const idx = s.days.indexOf(day);
      point[`mean_${s.key}`] = idx >= 0 ? s.mean[idx] : null;
      point[`band_${s.key}`] = idx >= 0 ? [s.lower[idx], s.upper[idx]] : null;
    });
    return point;
  });

  const formatXTick = (tick: number) => {
    if (tick === -2) return 'T-2';
    if (tick === -1) return 'T-1';
    if (tick === 0) return 'Event';
    if (tick === 1) return 'T+1';
    if (tick === 2) return 'T+2';
    return String(tick);
  };

  const CustomXTick = (props: any) => {
    const { x, y, payload } = props;
    const value = payload.value;
    const isEvent = value === 0;
    return (
      <text
        x={x}
        y={y + 14}
        textAnchor="middle"
        fill={isEvent ? 'var(--accent-primary)' : 'var(--text-tertiary)'}
        fontWeight={isEvent ? 'bold' : 'normal'}
        className="font-body text-[11px]"
      >
        {formatXTick(value)}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const day = Number(label);
      return (
        <div className="bg-bg-overlay border border-border-strong p-3 rounded-[4px] shadow-none z-50">
          <p className="font-body text-xs text-text-secondary uppercase tracking-widest mb-2 border-b border-border-subtle pb-1">
            Day: {formatXTick(day)}
          </p>
          <div className="space-y-1.5 font-mono text-xs tabular min-w-[150px]">
            {series.map((s) => {
              const idx = s.days.indexOf(day);
              if (idx < 0 || s.mean[idx] == null) return null;
              const color = colorFor(s.key);
              return (
                <div key={s.key} className="flex items-center justify-between gap-4">
                  <span className="font-body text-[11px]" style={{ color }}>
                    {s.label}
                  </span>
                  <span className="font-bold" style={{ color }}>
                    {s.mean[idx].toFixed(2)}
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

  return (
    <AnimatedChart>
      <div className="h-[280px] md:h-[400px] w-full relative select-none" role="img" aria-label="Event study indexed price path around the event day">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.5} vertical={false} />
            <XAxis
              dataKey="dayVal"
              type="number"
              domain={[-2, 2]}
              ticks={[-2, -1, 0, 1, 2]}
              tickLine={false}
              axisLine={false}
              tick={<CustomXTick />}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
              tickFormatter={(value) => value.toFixed(1)}
              domain={['auto', 'auto']}
            />
            <ReferenceLine x={0} stroke="var(--accent-primary)" strokeWidth={1.5} strokeDasharray="4 4" />
            {[-2, -1, 1, 2].map((d) => (
              <ReferenceLine
                key={d}
                x={d}
                stroke="var(--border-subtle)"
                strokeWidth={1}
                strokeOpacity={0.4}
                ifOverflow="extendDomain"
              />
            ))}
            <Tooltip content={<CustomTooltip />} />
            {series.map((s) => {
              const visible = visibleSeries[s.key] !== false;
              const color = colorFor(s.key);
              return (
                <React.Fragment key={s.key}>
                  {visible && s.count > 0 && (
                    <Area
                      dataKey={`band_${s.key}`}
                      fill={color}
                      fillOpacity={0.08}
                      stroke="none"
                      legendType="none"
                      connectNulls={true}
                      isAnimationActive={!reduce}
                      animationDuration={isMobile ? 500 : 800}
                      animationEasing="ease-out"
                    />
                  )}
                  {visible && s.count > 0 && (
                    <Line
                      type="monotone"
                      dataKey={`mean_${s.key}`}
                      name={`mean_${s.key}`}
                      stroke={color}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, stroke: 'var(--text-primary)', strokeWidth: 2 }}
                      connectNulls={true}
                      isAnimationActive={!reduce}
                      animationDuration={isMobile ? 500 : 800}
                      animationEasing="ease-out"
                    />
                  )}
                </React.Fragment>
              );
            })}
            <Legend
              iconType="rect"
              iconSize={10}
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ paddingTop: '20px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)' }}
              onClick={(entry: any) => {
                const key = String(entry?.dataKey ?? '').replace('mean_', '');
                if (key) onToggle(key);
              }}
              formatter={(value: string) => {
                const s = series.find((x) => `mean_${x.key}` === value);
                if (!s) return value;
                const visible = visibleSeries[s.key] !== false;
                return (
                  <span
                    className={`font-body text-xs uppercase tracking-widest select-none pl-1 transition-opacity duration-150 cursor-pointer ${
                      visible ? 'text-text-secondary opacity-100' : 'text-text-tertiary opacity-40 line-through'
                    }`}
                  >
                    {s.label} ({s.count})
                  </span>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </AnimatedChart>
  );
}
