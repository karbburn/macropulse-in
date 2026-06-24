<div align="center">

# MacroPulse — India Edition

**Bloomberg-grade macro event analysis, built with free APIs and open data.**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://macropulse-in.vercel.app)
[![Backend on Render](https://img.shields.io/badge/Backend_on-Render-blue?style=flat-square&logo=render)](https://macro-tracker-api.onrender.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-None-gray?style=flat-square)](#license)

</div>

---

## About

MacroPulse is a free web application that automatically plots how Indian financial markets — Nifty 50, USD/INR, G-Sec yields, and India VIX — react in defined time windows around macro events. It covers RBI MPC decisions, CPI prints, and IIP releases, replicating the core analytical workflow of institutional Bloomberg terminals: **event → surprise → reaction → attribution**. No login required. Built entirely with free APIs and open data.

## Features

- **Event Timeline** — Chronological view of all RBI MPC decisions, CPI prints, and IIP releases since 2018, filterable by type
- **Live Ticker Strip** — Real-time display of current repo rate, CPI, IIP, and Nifty price
- **Event Detail View** — Per-event drill-down with cross-asset snapshots at five time windows (T-60min to T+1day)
- **Surprise Scoring** — Actual vs. consensus comparison normalized by historical standard deviation
- **Event Study Analysis** — Average indexed market path grouped by hike/cut/hold with confidence bands
- **Scatter Plot & Regression** — Surprise vs. reaction with linear regression for CPI and IIP events
- **PDF Report Builder** — Select events and assets, toggle sections, download a publication-ready PDF
- **Responsive Design** — Desktop sticky nav with inline links; mobile bottom tab bar
- **Animated Transitions** — Framer Motion-powered page transitions, card animations, and stagger effects
- **Zero Paid APIs** — All data sourced from yfinance, data.gov.in, and manually curated CSVs

## Tech Stack

### Frontend

| Dependency | Version |
|---|---|
| Next.js | 16 |
| React | 19 |
| TypeScript | ^5 |
| Tailwind CSS | v4 (CSS-first config) |
| Recharts | ^3.8 |
| Framer Motion | ^12 |
| SWR | ^2.4 |
| Lucide React | ^1.21 |

**Fonts:** DM Serif Display · Syne · JetBrains Mono

### Backend

| Dependency | Version |
|---|---|
| Python | 3.11 |
| FastAPI | 0.111 |
| pandas | 2.2 |
| yfinance | 1.4 |
| scipy | 1.13 |
| ReportLab | 4.2 |
| Supabase | 2.4 |

### Data Sources

- **yfinance** — Intraday and daily price data for NIFTY 50, USD/INR, India VIX, 10Y G-Sec
- **Supabase** — Event cache and pre-computed snapshots
- **Manual CSVs** — RBI MPC calendar (2018–present) and consensus estimates
- **data.gov.in** — Indian government economic data

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Fill in env vars
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                         # http://localhost:3000
```

### Docker

```bash
cd backend
docker build -t macropulse-api .
docker run -p 8000:8000 --env-file .env macropulse-api
```

## Project Structure

```
MacroPulse/
├── backend/
│   ├── main.py                    # FastAPI app + route definitions
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── data/
│   │   ├── mpc_calendar.csv       # RBI MPC decisions (2018–present)
│   │   └── consensus.csv          # CPI/IIP actual vs consensus
│   └── modules/
│       ├── event_calendar.py      # Load + merge macro events
│       ├── market_snapshot.py     # yfinance intraday data
│       ├── reaction.py            # Reaction points + regression
│       ├── surprise.py            # Surprise score calculator
│       ├── event_study.py         # Event study paths
│       ├── live_rates.py          # Latest repo rate, CPI, IIP, Nifty
│       ├── pdf_generator.py       # Server-side PDF generation
│       └── cache.py               # Supabase caching layer
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Home — Event Timeline + Ticker
│       │   ├── study/page.tsx     # Event Study — Hike/Cut/Hold paths
│       │   ├── report/page.tsx    # PDF Report Builder
│       │   └── events/[id]/       # Per-event detail with snapshots
│       ├── components/
│       │   ├── NavBar.tsx         # Desktop sticky nav + mobile tabs
│       │   ├── EventTimeline.tsx  # Main timeline with filters
│       │   ├── EventStudyChart.tsx
│       │   ├── ReactionLineChart.tsx
│       │   ├── Footer.tsx
│       │   └── ...
│       └── lib/
│           ├── api.ts             # Backend API client
│           ├── types.ts           # TypeScript interfaces
│           └── motion.ts          # Framer Motion variants
├── .github/workflows/
│   ├── nightly_precompute.yml     # Daily snapshot precomputation
│   └── render-keepalive.yml       # Pings /health every 10 min
└── assets/
    ├── macropulse-DESIGN.md       # Design system
    └── macro-tracker-TECHSPEC.md  # Technical specification
```

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/latest-rates` | Latest repo rate, CPI, IIP, Nifty price |
| `GET` | `/events` | List events (filter: `event_type`, `from_date`, `to_date`, `limit`) |
| `GET` | `/events/{event_id}` | Full event detail with market snapshots |
| `GET` | `/scatter` | Surprise vs. reaction scatter + regression (`asset`, `event_type`) |
| `GET` | `/study` | Event study paths with confidence bands (`asset`) |
| `POST` | `/report` | Generate PDF report (`event_ids`, `assets`, `include_scatter`, `include_study`) |

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/service key |
| `FINNHUB_API_KEY` | Finnhub API key (free tier, optional) |
| `DATAGOV_API_KEY` | data.gov.in API key (optional) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (default: `http://localhost:8000`) |

## Deployment

**Frontend — Vercel:** [macropulse-in.vercel.app](https://macropulse-in.vercel.app)

**Backend — Render:** [macro-tracker-api.onrender.com](https://macro-tracker-api.onrender.com)

**GitHub Actions:**
- `nightly_precompute.yml` — Pre-computes market snapshots daily at 07:00 IST
- `render-keepalive.yml` — Pings `/health` every 10 minutes to prevent cold start

## Design Philosophy

> *MacroPulse is not a dashboard. It is an analytical instrument — the kind a macro strategist at a hedge fund would actually use.*
>
> **Precise. Dense. Editorial.** Data is the hero. Whitespace is earned. Typography carries weight over decoration. Numbers are always monospaced, tabular, and right-aligned. Nothing moves unless it means something.

## Author

**Sourabh Pradhan**

[![Portfolio](https://img.shields.io/badge/Portfolio-sourabh08.vercel.app-000?style=flat-square&logo=vercel&logoColor=white)](https://sourabh08.vercel.app)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-sourabh--pradhan07-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/sourabh-pradhan07)
[![GitHub](https://img.shields.io/badge/GitHub-karbburn-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/karbburn)

## License

No license. All rights reserved.
