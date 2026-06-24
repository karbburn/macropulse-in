'use client';

import React from 'react';

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center">
      <div className="rounded-[4px] border border-[var(--negative)]/20 bg-[var(--negative)]/5 p-6">
        <p className="text-[var(--negative)] font-medium text-lg">Something went wrong loading the report builder</p>
        <p className="text-text-secondary text-sm mt-1">{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="mt-4 bg-[var(--accent-primary)] text-text-inverse px-4 py-2 rounded-[4px] font-body text-sm font-semibold hover:bg-[var(--accent-dim)] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
