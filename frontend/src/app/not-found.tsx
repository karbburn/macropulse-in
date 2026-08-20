import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center flex flex-col items-center gap-6">
      <span className="font-mono text-7xl leading-none text-text-tertiary">404</span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Event not found
        </h1>
        <p className="font-body text-sm text-text-secondary max-w-md mx-auto">
          The macro event you are looking for does not exist or may have been recategorised. Browse the full
          timeline of RBI, CPI, and IIP events instead.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-[4px] bg-[var(--accent-primary)] hover:bg-[var(--accent-dim)] text-text-inverse py-2.5 px-5 text-sm font-semibold transition-colors select-none"
      >
        Back to Timeline
      </Link>
    </div>
  );
}
