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

interface StudyDataPoint {
  dayVal: number;
  hikeMean: number | null;
  hikeBand: [number, number] | null;
  cutMean: number | null;
  cutBand: [number, number] | null;
  holdMean: number | null;
  holdBand: [number, number] | null;
}

interface EventStudyChartProps {
  data: StudyDataPoint[];
  visibleSeries: { hike: boolean; cut: boolean; hold: boolean };
  setVisibleSeries: React.Dispatch<React.SetStateAction<{ hike: boolean; cut: boolean; hold: boolean }>>;
  counts: { hike: number; cut: number; hold: number };
}

export default function EventStudyChart({
  data,
  visibleSeries,
  setVisibleSeries,
  counts,
}: EventStudyChartProps) {
  const isMobile = useIsMobile();
  const reduce = useReducedMotion();

  const handleLegendClick = (entry: any) => {
    const { dataKey } = entry; // 'hikeMean', 'cutMean', or 'holdMean'
    if (!dataKey) return;
    const key = dataKey.replace('Mean', '') as 'hike' | 'cut' | 'hold';
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const formatXTick = (tick: number) => {
    if (tick === -2) return 'T-2';
    if (tick === -1) return 'T-1';
    if (tick === 0) return 'Event';
    if (tick === 1) return 'T+1';
    if (tick === 2) return 'T+2';
    return String(tick);
  };

  // Custom X-Axis Tick to highlight the Event day in gold and bold
  const CustomXTick = (props: any) => {
    const { x, y, payload } = props;
    const value = payload.value;
    const isEvent = value === 0;
    
    const fill = isEvent ? 'var(--accent-primary)' : 'var(--text-tertiary)';
    const fontWeight = isEvent ? 'bold' : 'normal';

    return (
      <text
        x={x}
        y={y + 14}
        textAnchor="middle"
        fill={fill}
        fontWeight={fontWeight}
        className="font-body text-[11px]"
      >
        {formatXTick(value)}
      </text>
    );
  };

  // Custom Tooltip for Event Study
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-overlay border border-border-strong p-3 rounded-[4px] shadow-none z-50">
          <p className="font-body text-xs text-text-secondary uppercase tracking-widest mb-2 border-b border-border-subtle pb-1">
            Day: {formatXTick(Number(label))}
          </p>
          <div className="space-y-1.5 font-mono text-xs tabular min-w-[150px]">
            {payload.map((entry: any) => {
              // Only display mean lines, skip confidence bands in tooltip text
              if (entry.dataKey.includes('Band')) return null;

              const val = entry.value;
              if (val === null || val === undefined) return null;

              const key = entry.dataKey.replace('Mean', '') as 'hike' | 'cut' | 'hold';
              let colorClass = 'text-text-secondary';
              if (key === 'hike') colorClass = 'text-[var(--chart-hike)]';
              else if (key === 'cut') colorClass = 'text-[var(--chart-cut)]';
              else if (key === 'hold') colorClass = 'text-[var(--chart-hold)]';

              return (
                <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                  <span className="text-text-secondary font-body text-[11px]">{entry.name}</span>
                  <span className={`font-bold ${colorClass}`}>
                    {val.toFixed(2)}
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
      <div className="h-[280px] md:h-[400px] w-full relative select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
          >
            {/* Grid */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              opacity={0.5}
              vertical={false}
            />

            {/* X-Axis */}
            <XAxis
              dataKey="dayVal"
              type="number"
              domain={[-2, 2]}
              ticks={[-2, -1, 0, 1, 2]}
              tickLine={false}
              axisLine={false}
              tick={<CustomXTick />}
            />

            {/* Y-Axis */}
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{
                fill: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
              }}
              tickFormatter={(value) => value.toFixed(1)}
              domain={['auto', 'auto']}
            />

            {/* Event Day Reference Line x=0 */}
            <ReferenceLine
              x={0}
              stroke="var(--accent-primary)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />

            {/* Tooltip */}
            <Tooltip content={<CustomTooltip />} />

            {/* Shaded Confidence Bands (Areas) */}
            {visibleSeries.hike && counts.hike > 0 && (
              <Area
                dataKey="hikeBand"
                fill="var(--chart-hike)"
                fillOpacity={0.08}
                stroke="none"
                legendType="none"
                connectNulls={true}
                isAnimationActive={!reduce}
                animationDuration={isMobile ? 500 : 800}
                animationEasing="ease-out"
              />
            )}
            {visibleSeries.cut && counts.cut > 0 && (
              <Area
                dataKey="cutBand"
                fill="var(--chart-cut)"
                fillOpacity={0.08}
                stroke="none"
                legendType="none"
                connectNulls={true}
                isAnimationActive={!reduce}
                animationDuration={isMobile ? 500 : 800}
                animationEasing="ease-out"
              />
            )}
            {visibleSeries.hold && counts.hold > 0 && (
              <Area
                dataKey="holdBand"
                fill="var(--chart-hold)"
                fillOpacity={0.08}
                stroke="none"
                legendType="none"
                connectNulls={true}
                isAnimationActive={!reduce}
                animationDuration={isMobile ? 500 : 800}
                animationEasing="ease-out"
              />
            )}

            {/* Mean Lines */}
            {visibleSeries.hike && counts.hike > 0 && (
              <Line
                type="monotone"
                dataKey="hikeMean"
                name="Hike Mean"
                stroke="var(--chart-hike)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, stroke: 'var(--text-primary)', strokeWidth: 2 }}
                connectNulls={true}
                isAnimationActive={!reduce}
                animationDuration={isMobile ? 500 : 800}
                animationEasing="ease-out"
              />
            )}
            {visibleSeries.cut && counts.cut > 0 && (
              <Line
                type="monotone"
                dataKey="cutMean"
                name="Cut Mean"
                stroke="var(--chart-cut)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, stroke: 'var(--text-primary)', strokeWidth: 2 }}
                connectNulls={true}
                isAnimationActive={!reduce}
                animationDuration={isMobile ? 500 : 800}
                animationEasing="ease-out"
              />
            )}
            {visibleSeries.hold && counts.hold > 0 && (
              <Line
                type="monotone"
                dataKey="holdMean"
                name="Hold Mean"
                stroke="var(--chart-hold)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, stroke: 'var(--text-primary)', strokeWidth: 2 }}
                connectNulls={true}
                isAnimationActive={!reduce}
                animationDuration={isMobile ? 500 : 800}
                animationEasing="ease-out"
              />
            )}

            {/* Interactive Legend */}
            <Legend
              iconType="rect"
              iconSize={10}
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{
                paddingTop: '20px',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
              }}
              onClick={handleLegendClick}
              formatter={(value, entry: any) => {
                const { dataKey } = entry;
                const key = dataKey.replace('Mean', '') as 'hike' | 'cut' | 'hold';
                const isVisible = visibleSeries[key];
                const count = counts[key];
                const label = key === 'hike' ? 'Rate Hike' : key === 'cut' ? 'Rate Cut' : 'Policy Hold';
                return (
                  <span
                    className={`font-body text-xs uppercase tracking-widest select-none pl-1 transition-opacity duration-150 cursor-pointer ${
                      isVisible ? 'text-text-secondary opacity-100' : 'text-text-tertiary opacity-40 line-through'
                    }`}
                  >
                    {label} ({count} events)
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
