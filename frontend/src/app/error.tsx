'use client';

import React from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center flex flex-col items-center gap-6">
      <span className="font-mono text-7xl leading-none text-text-tertiary">!</span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Something went wrong
        </h1>
        <p className="font-body text-sm text-text-secondary max-w-md mx-auto">
          An unexpected error occurred while loading this page. You can retry, or return to the timeline.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-[4px] bg-[var(--accent-primary)] hover:bg-[var(--accent-dim)] text-text-inverse py-2.5 px-5 text-sm font-semibold transition-colors select-none cursor-pointer"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-[4px] border border-border-strong text-text-secondary hover:text-text-primary hover:border-border-strong py-2.5 px-5 text-sm font-semibold transition-colors select-none"
        >
          Back to Timeline
        </Link>
      </div>
    </div>
  );
}
