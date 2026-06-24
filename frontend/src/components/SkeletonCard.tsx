'use client';

import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="relative flex flex-col justify-between rounded-[4px] border border-border-subtle bg-bg-surface p-5 border-l-[3px] border-l-border-strong w-full min-h-[160px]">
      {/* Top Row: Meta and Badge */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 w-1/2">
          <div className="h-3 bg-border-subtle rounded w-1/3 skeleton" />
          <span className="text-text-tertiary font-mono text-xs">•</span>
          <div className="h-3 bg-border-subtle rounded w-1/2 skeleton" />
        </div>
        <div className="h-6 bg-border-subtle rounded-full w-16 skeleton" />
      </div>

      {/* Middle: Outcome Title */}
      <div className="mb-3 w-3/4">
        <div className="h-5 bg-border-subtle rounded skeleton" />
      </div>

      {/* Notes Sub-line */}
      <div className="mb-4 space-y-2">
        <div className="h-3.5 bg-border-subtle rounded w-full skeleton" />
        <div className="h-3.5 bg-border-subtle rounded w-5/6 skeleton" />
      </div>

      {/* Bottom Row: Reactions and Arrow */}
      <div className="flex items-center justify-between gap-4 border-t border-border-subtle/40 pt-3 mt-auto">
        <div className="flex items-center gap-4 w-2/3">
          <div className="h-3 bg-border-subtle rounded w-1/4 skeleton" />
          <span className="text-text-tertiary">•</span>
          <div className="h-3 bg-border-subtle rounded w-1/4 skeleton" />
          <span className="text-text-tertiary">•</span>
          <div className="h-3 bg-border-subtle rounded w-1/4 skeleton" />
        </div>
        <div className="h-3.5 bg-border-subtle rounded w-4 skeleton" />
      </div>
    </div>
  );
}
