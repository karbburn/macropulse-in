'use client'

// Custom inline SVG icons — lucide-react v1.21+ dropped brand icons (Github, Linkedin)
const GithubIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

const LinkedinIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-base)',
        paddingTop: 'var(--space-6)',
        paddingBottom: 'var(--space-6)',
        paddingLeft: 'var(--space-8)',
        paddingRight: 'var(--space-8)',
        marginTop: 'var(--space-16)',
      }}
    >
      {/* ── Main row ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--space-6)',
          flexWrap: 'wrap',
        }}
      >
        {/* LEFT — Product identity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',   // DM Serif Display
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              letterSpacing: '0',
            }}
          >
            MacroPulse
            <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
              {' '}- India Edition
            </span>
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',      // JetBrains Mono
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              opacity: 0.7,
            }}
          >
            © 2026
          </span>
        </div>

        {/* CENTER — Builder credit */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-1)',
          }}
        >
          {/* "Built by Sourabh" — "Sourabh" is the clickable element */}
          <span
            style={{
              fontFamily: 'var(--font-body)',      // Syne
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
            }}
          >
            Built by{' '}
            <a
              href="https://sourabh08.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent-primary)',
                textDecoration: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                transition: 'opacity 150ms ease-out',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Sourabh
            </a>
          </span>

          {/* Portfolio link as text label */}
          <a
            href="https://sourabh08.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-mono)',      // JetBrains Mono
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              textDecoration: 'none',
              opacity: 0.6,
              transition: 'color 150ms ease-out, opacity 150ms ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--accent-primary)'
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.opacity = '0.6'
            }}
          >
            Portfolio ↗
          </a>
        </div>

        {/* RIGHT — Social links */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 'var(--space-2)',
          }}
        >
          {/* GitHub */}
          <a
            href="https://github.com/karbburn"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              fontFamily: 'var(--font-body)',      // Syne
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              textDecoration: 'none',
              letterSpacing: 'var(--tracking-wide)',
              transition: 'color 150ms ease-out',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <GithubIcon size={12} />
            GitHub ↗
          </a>

          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/in/sourabh-pradhan07/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              fontFamily: 'var(--font-body)',      // Syne
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              textDecoration: 'none',
              letterSpacing: 'var(--tracking-wide)',
              transition: 'color 150ms ease-out',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <LinkedinIcon size={12} />
            LinkedIn ↗
          </a>
        </div>
      </div>

      {/* ── Attribution row ── */}
      <div
        style={{
          marginTop: 'var(--space-5)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',          // JetBrains Mono
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
          opacity: 0.5,
          letterSpacing: '0.04em',
        }}
      >
        Market data: yfinance&nbsp;&nbsp;·&nbsp;&nbsp;Finnhub&nbsp;&nbsp;·&nbsp;&nbsp;data.gov.in&nbsp;&nbsp;·&nbsp;&nbsp;RBI Press Releases
      </div>
    </footer>
  )
}
