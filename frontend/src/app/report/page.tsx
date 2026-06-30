'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, Download, Gavel, TrendingUp, BarChart3 } from 'lucide-react';
import { fetchEvents } from '../../lib/api';
import { MacroEvent } from '../../lib/types';
import { PageWrapper } from '../../components/PageWrapper';
import FilterTabs from '../../components/FilterTabs';

export default function ReportPage() {
  const reduce = useReducedMotion();
  const [events, setEvents] = useState<MacroEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>(['NIFTY', 'USDINR', 'VIX', 'GSEC']);
  const [includeScatter, setIncludeScatter] = useState(true);
  const [includeStudy, setIncludeStudy] = useState(true);
  const [includeReaction, setIncludeReaction] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const MAX_EVENTS = 20;

  // Fetch events on mount
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

  // Filter events based on active tab and search query
  const filteredEvents = events.filter((event) => {
    const matchesTab = filterType === 'ALL' || event.event_type === filterType;
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
      // Add missing ones, respecting max events cap
      const spacesLeft = MAX_EVENTS - prev.length;
      if (toAdd.length > spacesLeft) {
        setErrorMsg(`Cannot select all. Maximum limit of ${MAX_EVENTS} events reached.`);
        return [...prev, ...toAdd.slice(0, spacesLeft)];
      }
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
          include_reaction: includeReaction,
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
      setTimeout(() => {
        a.remove();
        window.URL.revokeObjectURL(url);
      }, 100);

      setSuccessMsg('PDF Report downloaded successfully.');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      const message =
        err instanceof Error
          ? err.message
          :           'Failed to connect to the PDF generator backend endpoint.';
      setErrorMsg(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const estPages = Math.ceil(
    1 + selectedEventIds.length * 0.5 + (includeReaction ? 1 : 0) + (includeScatter ? 1 : 0) + (includeStudy ? 1 : 0)
  );

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6 md:gap-8">
        {/* Title */}
        <div className="flex flex-col gap-2 text-left">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            PDF Report <span className="text-[var(--accent-primary)] font-display italic">Builder</span>
          </h1>
          <p className="text-sm text-text-secondary max-w-xl font-body">
            Compile custom macro events and assets into a publication-ready PDF impact analysis report.
          </p>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div
            className="rounded-[4px] border border-border-strong p-4 text-xs font-body text-[var(--negative)]"
            style={{ background: 'var(--negative-dim)', borderColor: 'var(--negative)' }}
          >
            <strong>Error: </strong> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            className="rounded-[4px] border border-border-strong p-4 text-xs font-body text-[var(--positive)]"
            style={{ background: 'var(--positive-dim)', borderColor: 'var(--positive)' }}
          >
            <strong>Success: </strong> {successMsg}
          </div>
        )}

        {/* Main Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          {/* STEP 1: Left Panel — Event Picker (60% split / 7 cols) */}
          <div className="lg:col-span-7 rounded-[4px] border border-border-subtle bg-bg-surface p-5 md:p-6 flex flex-col gap-4 max-h-[65vh] hover:border-border-strong transition-colors">
            <div className="flex flex-col gap-1">
              <h3 className="font-body text-sm font-semibold text-text-primary uppercase tracking-wider">
                Select Timeline Events
              </h3>
              <p className="text-[11px] text-text-tertiary uppercase tracking-wider">
                Select up to {MAX_EVENTS} events for report compilation
              </p>
            </div>

            {/* Search Input (Borderless style) */}
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                <Search size={14} strokeWidth={1.5} />
              </span>
              <input
                type="text"
                placeholder="Search by ID, note, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-[4px] bg-bg-elevated border-0 pl-9 pr-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-body"
              />
            </div>

            {/* Filter Tabs */}
            <div className="border-b border-border-subtle">
              <FilterTabs active={filterType} onChange={setFilterType} />
            </div>

            {/* Selection Toolbar */}
            <div className="flex justify-between items-center text-xs select-none px-1">
              <button
                onClick={handleSelectAllFiltered}
                className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] font-body font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                disabled={filteredEvents.length === 0}
              >
                Toggle Page ({filteredEvents.length})
              </button>
              <span className="font-mono text-text-tertiary uppercase tracking-wider text-[11px]">
                Selected: {selectedEventIds.length} / {MAX_EVENTS}
              </span>
            </div>

            {/* Scrollable Event List */}
            <div
              className="flex-1 overflow-y-auto rounded-[4px] bg-bg-base border border-border-subtle divide-y divide-border-subtle/40"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--border-strong) transparent',
              }}
            >
              {isLoadingEvents ? (
                <div className="flex h-full items-center justify-center">
                  <div className="spinner h-6 w-6"></div>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="flex h-full items-center justify-center text-text-tertiary font-display italic text-sm">
                  No events match filter criteria.
                </div>
              ) : (
                <div className="flex flex-col">
                  <AnimatePresence mode="popLayout">
                    {filteredEvents.map((event) => {
                      const isChecked = selectedEventIds.includes(event.id);
                      return (
                        <motion.div
                          key={event.id}
                          layout
                          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                          transition={{ duration: reduce ? 0 : 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                          <label
                            htmlFor={`chk-${event.id}`}
                            className={`flex items-start gap-4 p-4 text-xs cursor-pointer hover:bg-bg-elevated/60 transition-colors border-l-2 select-none ${
                              isChecked
                                ? 'bg-[var(--accent-glow)] border-l-[var(--accent-primary)]'
                                : 'border-l-transparent'
                            }`}
                          >
                            {/* Custom Checkbox */}
                            <div className="relative flex items-center mt-0.5">
                              <input
                                id={`chk-${event.id}`}
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleEvent(event.id)}
                                className="sr-only"
                              />
                              <div
                                className={`w-4 h-4 rounded-[2px] border flex items-center justify-center transition-colors duration-150 ${
                                  isChecked
                                    ? 'border-[var(--accent-primary)] bg-bg-base'
                                    : 'border-border-strong bg-bg-base hover:border-border-accent'
                                }`}
                              >
                                {isChecked && (
                                  <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-[1px]" />
                                )}
                              </div>
                            </div>

                            {/* Event Details */}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-text-primary text-[13px]">
                                  {event.id}
                                </span>
                                <span className="font-mono text-text-secondary text-[11px]">
                                  {event.date}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 text-[9px] font-semibold bg-bg-base uppercase tracking-wider"
                                  style={{
                                    color: `var(--event-${event.event_type.toLowerCase()})`,
                                    borderColor: `var(--event-${event.event_type.toLowerCase()})33`,
                                  }}
                                >
                                  {event.event_type === 'MPC' && <Gavel size={10} strokeWidth={1.5} />}
                                  {event.event_type === 'CPI' && <TrendingUp size={10} strokeWidth={1.5} />}
                                  {event.event_type === 'IIP' && <BarChart3 size={10} strokeWidth={1.5} />}
                                  <span>{event.event_type}</span>
                                </span>
                                {event.outcome && (
                                  <span className="text-text-tertiary text-[10px] uppercase tracking-wide">
                                    Outcome:{' '}
                                    <strong className="text-text-secondary font-mono">
                                      {event.outcome}
                                    </strong>
                                  </span>
                                )}
                              </div>
                              {event.notes && (
                                <p className="text-text-secondary text-xs italic font-body line-clamp-1">
                                  "{event.notes}"
                                </p>
                              )}
                            </div>
                          </label>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: Right Panel — Configurations (40% split / 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="rounded-[4px] border border-border-subtle bg-bg-surface p-5 md:p-6 flex flex-col gap-6 hover:border-border-strong transition-colors">
              <div className="flex flex-col gap-1">
                <h3 className="font-body text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Report Configurations
                </h3>
                <p className="text-[11px] text-text-tertiary uppercase tracking-wider">
                  Select report assets and data chapters
                </p>
              </div>

              {/* ASSETS section */}
              <div className="flex flex-col gap-3">
                <span className="font-body text-xs font-semibold tracking-widest text-text-secondary uppercase select-none">
                  Assets
                </span>
                <div className="grid grid-cols-2 gap-3 select-none">
                  {([
                    { key: 'NIFTY', name: 'Nifty 50', dot: 'bg-[var(--chart-nifty)]' },
                    { key: 'USDINR', name: 'USD / INR', dot: 'bg-[var(--chart-usdinr)]' },
                    { key: 'VIX', name: 'India VIX', dot: 'bg-[var(--chart-vix)]' },
                    { key: 'GSEC', name: '10Y G-Sec', dot: 'bg-[var(--chart-gsec)]' },
                  ] as const).map((asset) => {
                    const isChecked = selectedAssets.includes(asset.key);
                    return (
                      <label
                        key={asset.key}
                        htmlFor={`asset-${asset.key}`}
                        className={`flex items-center gap-3 rounded-[4px] border p-3 cursor-pointer text-xs transition-all ${
                          isChecked
                            ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-glow)] text-text-primary'
                            : 'border-border-subtle bg-bg-base text-text-secondary hover:border-border-strong'
                        }`}
                      >
                        <input
                          id={`asset-${asset.key}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAsset(asset.key)}
                          className="sr-only"
                        />
                        {/* Custom Checkbox */}
                        <div
                          className={`w-4 h-4 rounded-[2px] border flex items-center justify-center transition-colors duration-150 shrink-0 ${
                            isChecked
                              ? 'border-[var(--accent-primary)] bg-bg-base'
                              : 'border-border-strong bg-bg-base hover:border-border-accent'
                          }`}
                        >
                          {isChecked && (
                            <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-[1px]" />
                          )}
                        </div>

                        {/* Dot + Label */}
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${asset.dot}`} />
                          <span className="font-body font-semibold">{asset.name}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <hr className="border-border-subtle" />

              {/* SECTIONS section */}
              <div className="flex flex-col gap-4 select-none">
                <span className="font-body text-xs font-semibold tracking-widest text-text-secondary uppercase select-none">
                  Sections
                </span>

                {/* Chapter Checklist items */}
                <div className="flex flex-col gap-3">
                  {/* Reaction Charts Chapter */}
                  <label
                    htmlFor="chk-reaction"
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex flex-col">
                      <span className="font-body text-xs text-text-primary group-hover:text-text-primary transition-colors font-semibold">
                        Cross-Asset Reaction Charts
                      </span>
                      <span className="text-[10px] text-text-tertiary uppercase tracking-wider mt-0.5">
                        Intraday price movement across T-60 to T+1D
                      </span>
                    </div>
                    <input
                      id="chk-reaction"
                      type="checkbox"
                      checked={includeReaction}
                      onChange={(e) => setIncludeReaction(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-[2px] border flex items-center justify-center transition-colors duration-150 ${
                        includeReaction
                          ? 'border-[var(--accent-primary)] bg-bg-base'
                          : 'border-border-strong bg-bg-base hover:border-border-accent'
                      }`}
                    >
                      {includeReaction && (
                        <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-[1px]" />
                      )}
                    </div>
                  </label>

                  {/* Scatter Chapter */}
                  <label
                    htmlFor="chk-scatter"
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex flex-col">
                      <span className="font-body text-xs text-text-primary group-hover:text-text-primary transition-colors font-semibold">
                        Historical Scatter Plots
                      </span>
                      <span className="text-[10px] text-text-tertiary uppercase tracking-wider mt-0.5">
                        Include regression analysis per asset class
                      </span>
                    </div>
                    <input
                      id="chk-scatter"
                      type="checkbox"
                      checked={includeScatter}
                      onChange={(e) => setIncludeScatter(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-[2px] border flex items-center justify-center transition-colors duration-150 ${
                        includeScatter
                          ? 'border-[var(--accent-primary)] bg-bg-base'
                          : 'border-border-strong bg-bg-base hover:border-border-accent'
                      }`}
                    >
                      {includeScatter && (
                        <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-[1px]" />
                      )}
                    </div>
                  </label>

                  {/* Event Study Chapter */}
                  <label
                    htmlFor="chk-study"
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex flex-col">
                      <span className="font-body text-xs text-text-primary group-hover:text-text-primary transition-colors font-semibold">
                        RBI MPC Event Study averages
                      </span>
                      <span className="text-[10px] text-text-tertiary uppercase tracking-wider mt-0.5">
                        Include average price path (Hike/Cut/Hold)
                      </span>
                    </div>
                    <input
                      id="chk-study"
                      type="checkbox"
                      checked={includeStudy}
                      onChange={(e) => setIncludeStudy(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-[2px] border flex items-center justify-center transition-colors duration-150 ${
                        includeStudy
                          ? 'border-[var(--accent-primary)] bg-bg-base'
                          : 'border-border-strong bg-bg-base hover:border-border-accent'
                      }`}
                    >
                      {includeStudy && (
                        <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-[1px]" />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Divider */}
              <hr className="border-border-subtle" />

              {/* Selected Count & Download Trigger Button */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center select-none">
                  <span className="font-body text-xs text-text-secondary uppercase tracking-wider">
                    Total Selection
                  </span>
                  <span className="font-mono text-sm font-bold text-[var(--accent-primary)] tabular-nums">
                    {selectedEventIds.length} events · {selectedAssets.length} assets · est. {estPages} pages
                  </span>
                </div>

                <button
                  onClick={handleGenerateReport}
                  disabled={selectedEventIds.length === 0 || isGenerating}
                  className="w-full rounded-[3px] bg-[var(--accent-primary)] hover:bg-[var(--accent-dim)] text-text-inverse py-3 px-4 text-center text-sm font-semibold shadow-none transition-all duration-150 ease-out cursor-pointer disabled:opacity-38 disabled:cursor-not-allowed select-none"
                >
                  <AnimatePresence mode="wait">
                    {isGenerating ? (
                      <motion.span
                        key="loading"
                        initial={reduce ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, y: -4 }}
                        transition={{ duration: reduce ? 0 : 0.15 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <span className="spinner h-4 w-4 border-[2.5px]" style={{ borderTopColor: 'var(--text-inverse)' }}></span>
                        <span>Building Report PDF...</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={reduce ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, y: -4 }}
                        transition={{ duration: reduce ? 0 : 0.15 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <Download size={14} strokeWidth={1.5} />
                        <span>Generate PDF Report</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* STEP 3: Static Sample Page Thumbnails */}
            <div className="rounded-[4px] border border-border-subtle bg-bg-surface/50 p-5 flex flex-col gap-3 hover:border-border-strong transition-colors">
              <span className="font-body text-xs font-semibold tracking-widest text-text-secondary uppercase select-none">
                Report Page Previews
              </span>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'Overview', label: 'Cover Page' },
                  { name: 'Reactions', label: 'Impact Matrix' },
                  { name: 'Analysis', label: 'Path Study' },
                ].map((thumb, idx) => (
                  <div
                    key={thumb.name}
                    className="aspect-[0.7] rounded-[2px] bg-bg-elevated border border-border-subtle flex flex-col items-center justify-center p-2 transition-all duration-300 hover:border-[var(--accent-primary)]/40 hover:bg-bg-elevated/80 select-none group"
                  >
                    <span className="font-mono text-[9px] text-text-tertiary group-hover:text-[var(--accent-primary)] transition-colors uppercase tracking-wider">
                      Page {idx + 1}
                    </span>
                    <span className="font-body text-[10px] text-text-secondary group-hover:text-text-primary transition-colors text-center mt-1 font-semibold line-clamp-1">
                      {thumb.name}
                    </span>
                    <span className="text-[8px] text-text-tertiary text-center leading-none mt-0.5 block">
                      {thumb.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
