'use client';

import React, { useState, useEffect } from 'react';
import { fetchEvents } from '../../lib/api';
import { MacroEvent } from '../../lib/types';

export default function ReportPage() {
  const [events, setEvents] = useState<MacroEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>(['NIFTY', 'USDINR', 'VIX', 'GSEC']);
  const [includeScatter, setIncludeScatter] = useState(true);
  const [includeStudy, setIncludeStudy] = useState(true);
  const [filterType, setFilterType] = useState<'All' | 'MPC' | 'CPI' | 'IIP'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const MAX_EVENTS = 20;

  useEffect(() => {
    fetchEvents('all', undefined, undefined, 100)
      .then((data) => {
        setEvents(data.events);
        setIsLoadingEvents(false);
      })
      .catch((err) => {
        console.error('Failed to load report events:', err);
        setErrorMsg('Failed to load events list for report selection.');
        setIsLoadingEvents(false);
      });
  }, []);

  // Filter events based on tab and search query
  const filteredEvents = events.filter((event) => {
    const matchesTab = filterType === 'All' || event.event_type === filterType;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      event.id.toLowerCase().includes(searchLower) ||
      (event.notes && event.notes.toLowerCase().includes(searchLower)) ||
      event.date.includes(searchLower);
    return matchesTab && matchesSearch;
  });

  const handleToggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) => {
      if (prev.includes(eventId)) return prev.filter((id) => id !== eventId);
      if (prev.length >= MAX_EVENTS) {
        setErrorMsg(`Maximum ${MAX_EVENTS} events per report.`);
        return prev;
      }
      return [...prev, eventId];
    });
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredEvents.map((e) => e.id);
    setSelectedEventIds((prev) => {
      // Find which ones of the filtered are not already selected
      const toAdd = filteredIds.filter((id) => !prev.includes(id));
      if (toAdd.length === 0) {
        // If all filtered are already selected, deselect them all
        return prev.filter((id) => !filteredIds.includes(id));
      }
      // Add missing ones
      return [...prev, ...toAdd];
    });
  };

  const handleToggleAsset = (asset: string) => {
    setSelectedAssets((prev) =>
      prev.includes(asset)
        ? prev.filter((a) => a !== asset)
        : [...prev, asset]
    );
  };

  const handleGenerateReport = async () => {
    if (selectedEventIds.length === 0) return;
    if (selectedAssets.length === 0) {
      setErrorMsg('Please select at least one asset class.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${baseUrl}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_ids: selectedEventIds,
          assets: selectedAssets,
          include_scatter: includeScatter,
          include_study: includeStudy,
        }),
      });

      if (!res.ok) {
        let errorDetail = '';
        try {
          const errJson = await res.json();
          errorDetail = errJson.detail || res.statusText;
        } catch {
          errorDetail = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorDetail);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `macro-impact-report-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg('PDF Report downloaded successfully.');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      const message = err instanceof Error ? err.message : 'Failed to connect to the PDF generator backend endpoint. Ensure Stage 6 Backend PDF module is implemented.';
      setErrorMsg(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="mb-8 text-center md:text-left">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Report <span className="text-brand-amber">Builder</span>
        </h1>
        <p className="mt-2 text-sm text-neutral-400 max-w-xl">
          Compile custom macro events and assets into a publication-ready PDF impact analysis report.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
          <div className="flex items-center gap-2 text-rose-400">
            <span className="font-bold text-sm">Error:</span>
            <span className="text-sm">{errorMsg}</span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="font-bold text-sm">Success:</span>
            <span className="text-sm">{successMsg}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel: Event List Checkboxes (7 cols on lg) */}
        <div className="lg:col-span-7 rounded-xl border border-neutral-800 bg-[#222222] p-5 shadow-lg flex flex-col h-[600px]">
          <div className="mb-4">
            <h3 className="font-serif text-lg font-bold text-white">Select Events</h3>
            <p className="text-xs text-neutral-400">Filter and choose events to include in the report</p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Search by ID, note, date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-lg bg-neutral-900 border border-neutral-850 px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-brand-amber font-mono"
            />
            <div className="flex rounded-md bg-neutral-900 p-1 border border-neutral-800 self-start">
              {(['All', 'MPC', 'CPI', 'IIP'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all ${
                    filterType === type
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="flex justify-between items-center mb-2 px-1 text-xs">
            <button
              onClick={handleSelectAllFiltered}
              className="text-brand-amber hover:underline font-semibold"
              disabled={filteredEvents.length === 0}
            >
              Toggle All Filtered ({filteredEvents.length})
            </button>
            <span className="text-neutral-500 font-mono">
              Total Selected: {selectedEventIds.length}
            </span>
          </div>

          {/* Scrollable event list */}
          <div className="flex-1 overflow-y-auto border border-neutral-800 rounded-lg bg-neutral-900 divide-y divide-neutral-850">
            {isLoadingEvents ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-brand-amber border-r-transparent"></div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex h-full items-center justify-center text-neutral-500 text-xs">
                No events match filter criteria.
              </div>
            ) : (
              filteredEvents.map((event) => {
                const isChecked = selectedEventIds.includes(event.id);
                return (
                  <label
                    key={event.id}
                    className={`flex items-start gap-3 p-3 text-xs cursor-pointer hover:bg-neutral-850/60 transition-colors ${
                      isChecked ? 'bg-brand-amber/5' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleEvent(event.id)}
                      className="mt-0.5 rounded border-neutral-700 bg-neutral-900 text-brand-amber focus:ring-brand-amber focus:ring-offset-neutral-900"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white">{event.id}</span>
                        <span className="font-mono text-neutral-400">{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded px-1.5 py-0.2 text-[10px] font-semibold bg-neutral-800 ${
                          event.event_type === 'MPC' ? 'text-amber-400' : event.event_type === 'CPI' ? 'text-cyan-400' : 'text-indigo-400'
                        }`}>
                          {event.event_type}
                        </span>
                        {event.outcome && (
                          <span className="text-neutral-400 text-[10px]">
                            Outcome: <strong className="text-neutral-300 font-mono">{event.outcome}</strong>
                          </span>
                        )}
                      </div>
                      {event.notes && (
                        <p className="text-neutral-500 text-[10px] italic line-clamp-1">{event.notes}</p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Settings and Generator (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-[#222222] p-5 shadow-lg space-y-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Report Configuration</h3>
              <p className="text-xs text-neutral-400">Configure layout inclusions and assets</p>
            </div>

            {/* Target Assets */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Target Asset Classes</span>
              <div className="grid grid-cols-2 gap-3">
                {['NIFTY', 'USDINR', 'VIX', 'GSEC'].map((asset) => {
                  const isChecked = selectedAssets.includes(asset);
                  return (
                    <label
                      key={asset}
                      className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer text-xs transition-all ${
                        isChecked
                          ? 'border-brand-amber/40 bg-brand-amber/5 text-white font-semibold'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAsset(asset)}
                        className="rounded border-neutral-700 bg-neutral-900 text-brand-amber focus:ring-brand-amber focus:ring-offset-neutral-900"
                      />
                      <span>
                        {asset === 'NIFTY' ? 'Nifty 50' : asset === 'USDINR' ? 'USD / INR' : asset === 'VIX' ? 'India VIX' : '10Y G-Sec'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Inclusions */}
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Layout Sections</span>
              
              <label className="flex items-center justify-between cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-xs text-white block">Historical Scatter Plots</span>
                  <span className="text-[10px] text-neutral-500 block">Include regression analysis per asset class</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeScatter}
                  onChange={(e) => setIncludeScatter(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-brand-amber focus:ring-brand-amber focus:ring-offset-neutral-900"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-xs text-white block">RBI MPC Event Study</span>
                  <span className="text-[10px] text-neutral-500 block">Include average price path (Hike/Cut/Hold)</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeStudy}
                  onChange={(e) => setIncludeStudy(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-brand-amber focus:ring-brand-amber focus:ring-offset-neutral-900"
                />
              </label>
            </div>

            {/* Selected Summary and Button */}
            <div className="pt-4 border-t border-neutral-800 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Events selected:</span>
                <span className="font-mono text-white font-bold">{selectedEventIds.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Assets selected:</span>
                <span className="font-mono text-white font-bold">{selectedAssets.length}</span>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={selectedEventIds.length === 0 || isGenerating}
                className="w-full rounded-lg bg-brand-amber py-3 px-4 text-center text-sm font-semibold text-neutral-950 shadow-md hover:bg-amber-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-950 border-r-transparent"></div>
                    <span>Building Report PDF...</span>
                  </div>
                ) : (
                  'Generate PDF Report'
                )}
              </button>
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="rounded-xl border border-neutral-800 bg-[#222222]/50 p-4">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Report Content</h4>
            <ul className="text-xs text-neutral-500 list-disc pl-4 space-y-1">
              <li>Includes cover sheet and index information.</li>
              <li>Generates individual reaction grids showing the T-60 to T+1D changes.</li>
              <li>Includes scatter and path study charts if selected.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
