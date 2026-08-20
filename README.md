# MacroPulse — India Edition

**Event-impact analytics for Indian macro markets.**

MacroPulse quantifies how Indian financial markets respond to macroeconomic
events. It charts the reaction of Nifty 50, USD/INR, 10Y G-Sec yields, and
India VIX across defined windows around RBI MPC decisions, CPI prints, and IIP
releases — formalizing the institutional analyst's workflow of
*event → surprise → reaction → attribution*. No account required. Built
entirely on free APIs and open data.

[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://macropulse-in.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-blue?style=flat-square&logo=render)](https://macropulse-in.onrender.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)

---

## Overview

MacroPulse covers three recurring event classes — RBI monetary policy (MPC),
consumer inflation (CPI), and industrial output (IIP) — spanning 2018 to
present. For each event it computes a standardized *surprise* (actual versus
consensus, normalized by historical dispersion) and measures the subsequent
market reaction across five time windows, from T-60 minutes to T+1 trading day.
Aggregated event studies and surprise-versus-reaction regressions provide the
cross-sectional view an analyst would use to separate signal from noise.

## Capabilities

- **Event timeline** — Chronological, filterable view of all MPC, CPI, and IIP
  releases since 2018.
- **Live rate strip** — Current repo rate, CPI, IIP, and Nifty level.
- **Event detail** — Per-event drill-down with cross-asset snapshots at five
  reaction windows (T-60m → T+1d).
- **Surprise scoring** — Actual-vs-consensus, normalized by historical standard
  deviation.
- **Event study** — Average indexed path by policy action (hike / cut / hold)
  with confidence bands.
- **Scatter & regression** — Surprise against reaction, with OLS fit for CPI and
  IIP.
- **PDF reports** — Publication-ready exports with selectable events, assets,
  and sections.
- **Responsive interface** — Desktop sticky navigation; mobile tab bar.

## Architecture

### Frontend

| Dependency | Version |
|---|---|
| Next.js | 16 |
| React | 19 |
| TypeScript | ^5 |
| Tailwind CSS | v4 (CSS-first) |
| Recharts | ^3.8 |
| Framer Motion | ^12 |
| SWR | ^2.4 |
| Lucide React | ^1.21 |

*Typefaces:* DM Serif Display · Syne · JetBrains Mono

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

### Data sources

- **yfinance** — Intraday and daily prices for Nifty 50, USD/INR, India VIX,
  10Y G-Sec.
- **Supabase** — Event cache and pre-computed snapshots.
- **Curated CSVs** — RBI MPC calendar (2018–present) and consensus estimates.
- **data.gov.in** — Indian government economic statistics.

## Getting started

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

## Repository layout

```
MacroPulse/
├── backend/
│   ├── main.py                    # FastAPI app + routes
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── data/
│   │   ├── mpc_calendar.csv       # RBI MPC decisions (2018–present)
│   │   └── consensus.csv          # CPI/IIP actual vs consensus
│   └── modules/
│       ├── event_calendar.py      # Event load + merge
│       ├── market_snapshot.py     # yfinance intraday data
│       ├── reaction.py            # Reaction points + regression
│       ├── surprise.py            # Surprise score
│       ├── event_study.py         # Event-study paths
│       ├── live_rates.py          # Latest repo rate, CPI, IIP, Nifty
│       ├── pdf_generator.py       # Server-side PDF
│       └── cache.py               # Supabase cache
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Home — timeline + ticker
│       │   ├── study/page.tsx     # Event study
│       │   ├── report/page.tsx    # PDF builder
│       │   └── events/[id]/       # Event detail
│       ├── components/
│       │   ├── NavBar.tsx
│       │   ├── EventTimeline.tsx
│       │   ├── EventStudyChart.tsx
│       │   ├── ReactionLineChart.tsx
│       │   ├── Footer.tsx
│       │   └── ...
│       └── lib/
│           ├── api.ts             # API client
│           ├── types.ts           # Interfaces
│           └── motion.ts          # Framer Motion variants
├── .github/workflows/
│   ├── nightly_precompute.yml     # Daily snapshot precompute
│   └── render-keepalive.yml       # /health ping every 5 min
└── assets/
    ├── macropulse-DESIGN.md       # Design system
    └── macro-tracker-TECHSPEC.md  # Technical specification
```

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/latest-rates` | Latest repo rate, CPI, IIP, Nifty |
| `GET` | `/events` | List events (`event_type`, `from_date`, `to_date`, `limit`) |
| `GET` | `/events/{event_id}` | Event detail + snapshots |
| `GET` | `/scatter` | Surprise vs reaction (`asset`, `event_type`) |
| `GET` | `/study` | Event-study paths (`asset`) |
| `POST` | `/report` | PDF report (`event_ids`, `assets`, `include_scatter`, `include_study`) |

## Configuration

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/service key |
| `FINNHUB_API_KEY` | Finnhub key (free tier, optional) |
| `DATAGOV_API_KEY` | data.gov.in key (optional) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:8000`) |

## Deployment

- **Frontend — Vercel:** [macropulse-in.vercel.app](https://macropulse-in.vercel.app)
- **Backend — Render:** [macropulse-in.onrender.com](https://macropulse-in.onrender.com)

**CI:**
- `nightly_precompute.yml` — Pre-computes snapshots daily at 07:00 IST.
- `render-keepalive.yml` — Pings `/health` every 5 minutes to avoid cold starts.

## Author

**Sourabh Pradhan**

[![Portfolio](https://img.shields.io/badge/Portfolio-sourabh08.vercel.app-000?style=flat-square&logo=vercel&logoColor=white)](https://sourabh08.vercel.app)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-sourabh--pradhan07-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/sourabh-pradhan07)
[![GitHub](https://img.shields.io/badge/GitHub-karbburn-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/karbburn)

## License

All rights reserved. No license granted.
