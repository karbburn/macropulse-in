'use client';

import React, { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/PageWrapper';
import { fetchStudy } from '../../lib/api';
import { EventStudyPath } from '../../lib/types';
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

export default function StudyPage() {
  const [asset, setAsset] = useState<'NIFTY' | 'USDINR'>('NIFTY');
  const [paths, setPaths] = useState<EventStudyPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Find counts
  const hikePath = paths.find((p) => p.decision_type === 'hike');
  const cutPath = paths.find((p) => p.decision_type === 'cut');
  const holdPath = paths.find((p) => p.decision_type === 'hold');

  const hikeCount = hikePath?.event_count ?? 0;
  const cutCount = cutPath?.event_count ?? 0;
  const holdCount = holdPath?.event_count ?? 0;

  // Prepare chart data (days -2 to +2)
  const days = [-2, -1, 0, 1, 2];
  const chartData = days.map((day) => {
    const point: {
      name: string;
      dayVal: number;
      hikeMean: number | null;
      hikeBand: [number, number] | null;
      cutMean: number | null;
      cutBand: [number, number] | null;
      holdMean: number | null;
      holdBand: [number, number] | null;
    } = {
      name: `T${day >= 0 ? '+' : ''}${day}`,
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
        point.hikeMean = parseFloat(hikePath.mean_indexed[idx].toFixed(2));
        point.hikeBand = [
          parseFloat(hikePath.lower_band[idx].toFixed(2)),
          parseFloat(hikePath.upper_band[idx].toFixed(2)),
        ];
      }
    }

    if (cutPath) {
      const idx = cutPath.days.indexOf(day);
      if (idx !== -1) {
        point.cutMean = parseFloat(cutPath.mean_indexed[idx].toFixed(2));
        point.cutBand = [
          parseFloat(cutPath.lower_band[idx].toFixed(2)),
          parseFloat(cutPath.upper_band[idx].toFixed(2)),
        ];
      }
    }

    if (holdPath) {
      const idx = holdPath.days.indexOf(day);
      if (idx !== -1) {
        point.holdMean = parseFloat(holdPath.mean_indexed[idx].toFixed(2));
        point.holdBand = [
          parseFloat(holdPath.lower_band[idx].toFixed(2)),
          parseFloat(holdPath.upper_band[idx].toFixed(2)),
        ];
      }
    }

    return point;
  });

  return (
    <PageWrapper>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="mb-8 text-center md:text-left flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
            RBI MPC decisions <span className="text-brand-amber">Event Study</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-400 max-w-xl">
            Analyze the average indexed market path (indexed to 100 on Event Day T0) from T-2 to T+2 trading days for hikes, cuts, and holds.
          </p>
        </div>

        {/* Toggle buttons */}
        <div className="inline-flex rounded-lg bg-neutral-800 p-1 border border-neutral-700 self-center md:self-end">
          <button
            onClick={() => setAsset('NIFTY')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
              asset === 'NIFTY'
                ? 'bg-brand-amber text-neutral-950 shadow'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            Nifty 50
          </button>
          <button
            onClick={() => setAsset('USDINR')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
              asset === 'USDINR'
                ? 'bg-brand-amber text-neutral-950 shadow'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            USD / INR
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center mb-8">
          <p className="text-red-400 font-medium">Failed to load study data</p>
          <p className="text-neutral-500 text-sm mt-1">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-neutral-800 bg-[#222222]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-amber border-r-transparent"></div>
          <p className="text-neutral-400 mt-4 font-medium">Computing event study averages...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Chart Card */}
          <div className="lg:col-span-8 rounded-xl border border-neutral-800 bg-[#222222] p-6 shadow-lg">
            <h3 className="font-serif text-lg font-bold text-white mb-6">Indexed Price Path (T=0: 100)</h3>
            <div className="h-[400px] w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
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
                    tickFormatter={(value) => `${value}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f1f1f',
                      borderColor: '#3e3e3e',
                      borderRadius: '8px',
                      color: '#e5e7eb',
                    }}
                    labelClassName="font-bold text-brand-amber font-mono"
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '15px' }} />
                  
                  {/* Reference line for Event Day T0 */}
                  <ReferenceLine
                    x="T0"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    label={{
                      value: 'Event Day',
                      position: 'top',
                      fill: '#f59e0b',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      offset: 10
                    }}
                  />

                  {/* Confidence Band Areas */}
                  <Area
                    dataKey="hikeBand"
                    name="Hike Band (±1 Std)"
                    fill="#f59e0b"
                    fillOpacity={0.06}
                    stroke="none"
                    legendType="none"
                  />
                  <Area
                    dataKey="cutBand"
                    name="Cut Band (±1 Std)"
                    fill="#ef4444"
                    fillOpacity={0.06}
                    stroke="none"
                    legendType="none"
                  />
                  <Area
                    dataKey="holdBand"
                    name="Hold Band (±1 Std)"
                    fill="#737373"
                    fillOpacity={0.06}
                    stroke="none"
                    legendType="none"
                  />

                  {/* Mean Lines */}
                  {hikeCount > 0 && (
                    <Line
                      type="monotone"
                      dataKey="hikeMean"
                      name={`Rate Hike (N = ${hikeCount})`}
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: '#f59e0b', strokeWidth: 1, fill: '#1a1a1a' }}
                    />
                  )}
                  {cutCount > 0 && (
                    <Line
                      type="monotone"
                      dataKey="cutMean"
                      name={`Rate Cut (N = ${cutCount})`}
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: '#ef4444', strokeWidth: 1, fill: '#1a1a1a' }}
                    />
                  )}
                  {holdCount > 0 && (
                    <Line
                      type="monotone"
                      dataKey="holdMean"
                      name={`Policy Hold (N = ${holdCount})`}
                      stroke="#737373"
                      strokeWidth={3}
                      dot={{ r: 4, stroke: '#737373', strokeWidth: 1, fill: '#1a1a1a' }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right column sidebar explanation */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-neutral-800 bg-[#222222] p-5 shadow-lg">
              <h4 className="font-serif text-lg font-bold text-white mb-3">Understanding the Study</h4>
              <div className="space-y-4 text-sm text-neutral-300">
                <p>
                  An <strong>Event Study</strong> isolates the impact of a specific recurring event type on asset prices.
                </p>
                <p>
                  Here, we track the price behavior of <strong className="text-white">{asset}</strong> surrounding all historical RBI Monetary Policy Committee decisions since 2018.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-neutral-400">
                  <li><strong>T-2 to T+2:</strong> Represents trading days relative to the announcement day (T0). weekends and market holidays are excluded.</li>
                  <li><strong>Indexation:</strong> Every individual event's price path is scaled to 100 on the close of T0. The lines plot the average (mean) of these paths.</li>
                  <li><strong>Shaded Bands:</strong> Show the ±1 standard deviation range, indicating volatility and dispersion among individual event outcomes.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-[#222222] p-5 shadow-lg">
              <h4 className="font-serif text-base font-bold text-white mb-2">Observations</h4>
              <p className="text-sm text-neutral-400">
                Historically, RBI rate hikes tend to create moderate initial volatility with indexing reversion. Cuts are often pre-empted or generate more directional responses depending on macro environments. Holds represent standard policy baseline path behavior.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
    </PageWrapper>
  );
}
