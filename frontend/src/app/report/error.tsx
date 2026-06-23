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
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6">
        <p className="text-red-400 font-medium text-lg">Something went wrong loading the report builder</p>
        <p className="text-neutral-500 text-sm mt-1">{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
