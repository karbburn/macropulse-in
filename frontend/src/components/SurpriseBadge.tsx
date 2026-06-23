import React from 'react';

interface SurpriseBadgeProps {
  score: number | null;
}

export default function SurpriseBadge({ score }: SurpriseBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-400 ring-1 ring-inset ring-neutral-700 font-mono">
        Surprise: --
      </span>
    );
  }

  const absScore = Math.abs(score);
  const formattedScore = score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2);

  let bgClass = '';
  let textClass = '';
  let ringClass = '';

  if (absScore < 0.5) {
    // Green = low surprise
    bgClass = 'bg-emerald-500/10';
    textClass = 'text-emerald-400';
    ringClass = 'ring-emerald-500/20';
  } else if (absScore <= 1.5) {
    // Yellow = moderate surprise
    bgClass = 'bg-amber-500/10';
    textClass = 'text-amber-400';
    ringClass = 'ring-amber-500/20';
  } else {
    // Red = high surprise
    bgClass = 'bg-rose-500/10';
    textClass = 'text-rose-400';
    ringClass = 'ring-rose-500/20';
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ring-1 ring-inset font-mono ${bgClass} ${textClass} ${ringClass}`}>
      Surprise: {formattedScore}
    </span>
  );
}
