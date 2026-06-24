'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BarChart3, Download } from 'lucide-react'
import useSWR from 'swr'
import { fetchLatestRates } from '@/lib/api'


/**
 * MacroPulse NavBar
 * Source of truth: macropulse-DESIGN.md §5.1
 *
 * Desktop (≥768px): sticky top bar, 56px, wordmark + inline links + rate chip
 * Mobile (<768px):  fixed bottom tab bar, 60px + safe area
 */

const NAV_ITEMS = [
  { href: '/', label: 'HOME', mobileLabel: 'Timeline', icon: Home },
  { href: '/study', label: 'STUDY', mobileLabel: 'Study', icon: BarChart3 },
  { href: '/report', label: 'REPORT', mobileLabel: 'Report', icon: Download },
] as const

export function NavBar() {
  const pathname = usePathname()

  const { data: rates } = useSWR('latest-rates', fetchLatestRates, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000,   // 1 hour - matches backend cache
  })

  const repoLabel = rates?.repo_rate != null
    ? `RBI: ${rates.repo_rate.toFixed(2)}%`
    : 'RBI: -'


  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }


  return (
    <>
      {/* ─── Desktop Nav (≥768px) ─── */}
      <header
        className="hidden md:block sticky top-0 z-[100]"
        style={{
          height: '56px',
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="mx-auto max-w-7xl px-6 h-full flex items-center justify-between">
          {/* Left: Wordmark */}
          <Link
            href="/"
            className="hover:opacity-90 transition-opacity"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            MacroPulse
          </Link>

          {/* Center: Nav Links */}
          <nav className="flex items-center" style={{ gap: 'var(--space-6)' }}>
            {NAV_ITEMS.map(({ href, label }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    letterSpacing: 'var(--tracking-wide)',
                    textTransform: 'uppercase' as const,
                    color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    textDecoration: 'none',
                    paddingBottom: '4px',
                    transition: 'color 150ms ease-out',
                  }}
                >
                  {label}
                  {/* Active underline indicator — 2px bottom border */}
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '-1px',
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'var(--accent-primary)',
                        borderRadius: '1px',
                      }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right: Rate Chip */}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              padding: '4px 10px',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
            }}
          >
            {repoLabel}
          </div>

        </div>
      </header>

      {/* ─── Mobile Bottom Tab Bar (<768px) ─── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[100]"
        style={{
          height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-around h-[60px]">
          {NAV_ITEMS.map(({ href, mobileLabel, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-1"
                style={{
                  color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  textDecoration: 'none',
                  transition: 'color 150ms ease-out',
                  minWidth: '64px',
                }}
              >
                <Icon size={18} strokeWidth={1.5} />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  {mobileLabel}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
