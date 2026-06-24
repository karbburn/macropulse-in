"""
MacroPulse — FastAPI Backend
Main application entry point with route registration.

Endpoints (Stage 1 + 2 + 3 + 4):
  GET /health          — Health check
  GET /events          — List all events with optional filters
  GET /events/{id}     — Get single event by ID + market snapshots
  GET /scatter         — Get scatter data and regression for an asset
  GET /study           — Get event study paths for hike/cut/hold
"""

import asyncio
import logging
from datetime import date
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from modules.event_calendar import load_all_events, get_event_by_id, filter_events
from modules.pdf_generator import generate_pdf
from modules.market_snapshot import get_all_snapshots
from modules.reaction import build_reaction_points, compute_regression
from modules.event_study import compute_event_study
from modules.live_rates import get_latest_repo_rate, get_latest_cpi, get_latest_iip, get_latest_nifty



# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="MacroPulse — India Edition",
    description="API for tracking Indian macro event impacts on financial markets.",
    version="1.0",
)

# CORS middleware — locked to Vercel frontend + local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://macropulse-in.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict:
    """Health check endpoint. Used to wake Render free tier."""
    return {"status": "ok", "version": "1.0"}


@app.get("/api/latest-rates")
def latest_rates():
    """
    Returns latest macro indicators from local CSV data + yfinance.
    Lightweight — reads CSVs on every call (fast, files are tiny).
    Nifty fetch has sleep(1) — total response time ~1-2 seconds.
    
    Each indicator is fetched independently so one failure doesn't null the rest.
    Cache this response for 1 hour on the frontend using SWR.
    """
    errors: list[str] = []
    
    try:
        repo = get_latest_repo_rate()
    except Exception as e:
        logger.error(f"[/api/latest-rates] repo_rate error: {e}")
        repo = {"rate": None, "decision": None, "date": None}
        errors.append(f"repo: {e}")
    
    try:
        cpi = get_latest_cpi()
    except Exception as e:
        logger.error(f"[/api/latest-rates] cpi error: {e}")
        cpi = {"actual": None, "date": None}
        errors.append(f"cpi: {e}")
    
    try:
        iip = get_latest_iip()
    except Exception as e:
        logger.error(f"[/api/latest-rates] iip error: {e}")
        iip = {"actual": None, "date": None}
        errors.append(f"iip: {e}")
    
    try:
        nifty = get_latest_nifty()
    except Exception as e:
        logger.error(f"[/api/latest-rates] nifty error: {e}")
        nifty = {"price": None, "change_pct": None, "date": None}
        errors.append(f"nifty: {e}")
    
    return {
        "repo_rate": repo["rate"],
        "repo_decision": repo["decision"],
        "repo_date": repo["date"],
        "cpi_actual": cpi["actual"],
        "cpi_date": cpi["date"],
        "iip_actual": iip["actual"],
        "iip_date": iip["date"],
        "nifty_price": nifty["price"],
        "nifty_change_pct": nifty["change_pct"],
        "nifty_date": nifty["date"],
        "error": "; ".join(errors) if errors else None,
    }


@app.get("/events")
def list_events(
    event_type: str = Query(default="all", description="Filter by event type: MPC, CPI, IIP, or all"),
    from_date: Optional[str] = Query(default=None, description="Start date filter (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(default=None, description="End date filter (YYYY-MM-DD)"),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum number of events to return"),
) -> dict:
    """
    Returns all events, filterable by type, date range, and limit.

    Query params:
      - event_type: MPC | CPI | IIP | all (default: all)
      - from_date: YYYY-MM-DD
      - to_date: YYYY-MM-DD
      - limit: int (default: 100)
    """
    try:
        all_events = load_all_events()
    except Exception as e:
        logger.error(f"Failed to load events: {e}")
        raise HTTPException(status_code=500, detail="Failed to load events")

    # Parse date filters
    parsed_from: date | None = None
    parsed_to: date | None = None

    if from_date:
        try:
            parsed_from = date.fromisoformat(from_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid from_date format: '{from_date}'. Use YYYY-MM-DD.",
            )

    if to_date:
        try:
            parsed_to = date.fromisoformat(to_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid to_date format: '{to_date}'. Use YYYY-MM-DD.",
            )

    # Apply filters
    filtered = filter_events(
        events=all_events,
        event_type=event_type if event_type != "all" else None,
        from_date=parsed_from,
        to_date=parsed_to,
        limit=limit,
    )

    return {
        "events": [e.to_dict() for e in filtered],
        "total": len(filtered),
    }


@app.get("/events/{event_id}")
def get_event(event_id: str) -> dict:
    """
    Returns full event detail including market snapshots for all 4 assets.

    Each asset snapshot contains price data at five time windows:
    T-60, T0, T+30, T+2H, T+1D — with % change from T-60 baseline.
    """
    try:
        event = get_event_by_id(event_id)
    except Exception as e:
        logger.error(f"Error retrieving event {event_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal error retrieving event")

    if event is None:
        raise HTTPException(status_code=404, detail=f"Event not found: {event_id}")

    # Compute or retrieve cached snapshots for all four assets
    try:
        snapshots = get_all_snapshots(event)
    except Exception as e:
        logger.error(f"Error computing snapshots for {event_id}: {e}")
        snapshots = {"NIFTY": None, "USDINR": None, "VIX": None, "GSEC": None}

    return {
        "event": event.to_dict(),
        "snapshots": snapshots,
    }


@app.get("/scatter")
def get_scatter(
    asset: str = Query(..., description="Asset class: NIFTY, USDINR, VIX, GSEC"),
    event_type: str = Query(default="all", description="Event type: CPI, IIP, MPC, or all"),
    window: str = Query(default="T+2H", description="Reaction window: T+30, T+2H, T+1D"),
) -> dict:
    """
    Returns reaction points and linear regression data for scatter plot.
    """
    asset = asset.upper()
    if asset not in ["NIFTY", "USDINR", "VIX", "GSEC"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid asset: '{asset}'. Must be one of NIFTY, USDINR, VIX, GSEC."
        )

    event_type = event_type.upper()
    if event_type not in ["CPI", "IIP", "MPC", "ALL"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event_type: '{event_type}'. Must be one of CPI, IIP, MPC, ALL."
        )

    window = window.upper()
    if window not in ["T-60", "T0", "T+30", "T+2H", "T+1D"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid window: '{window}'. Must be one of T-60, T0, T+30, T+2H, T+1D."
        )

    # MPC events do not have surprise scores
    if event_type == "MPC":
        return {
            "points": [],
            "regression": {"slope": 0.0, "intercept": 0.0, "r_squared": 0.0},
            "message": "MPC events do not have numeric surprise scores."
        }

    try:
        all_events = load_all_events()
    except Exception as e:
        logger.error(f"Error loading events for scatter: {e}")
        raise HTTPException(status_code=500, detail="Failed to load events")

    # Filter events by type (excluding MPC because MPC surprise_score is always None)
    filtered_events = [e for e in all_events if e.event_type != "MPC"]
    if event_type != "ALL":
        filtered_events = [e for e in filtered_events if e.event_type == event_type]

    try:
        points = build_reaction_points(filtered_events, asset, window)
    except Exception as e:
        logger.error(f"Error building reaction points: {e}")
        raise HTTPException(status_code=500, detail="Error building reaction points")

    if not points:
        return {
            "points": [],
            "regression": {"slope": 0.0, "intercept": 0.0, "r_squared": 0.0},
            "message": "No consensus or market reaction data available for the selected parameters."
        }

    regression = compute_regression(points)

    return {
        "points": [p.to_dict() for p in points],
        "regression": regression
    }


@app.get("/study")
def get_study(
    asset: str = Query(..., description="Asset class: NIFTY or USDINR"),
) -> dict:
    """
    Returns event study paths (hike, cut, hold) for NIFTY or USDINR.
    """
    asset = asset.upper()
    if asset not in ["NIFTY", "USDINR"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid asset: '{asset}'. Event study only supports NIFTY or USDINR."
        )

    try:
        all_events = load_all_events()
    except Exception as e:
        logger.error(f"Error loading events for study: {e}")
        raise HTTPException(status_code=500, detail="Failed to load events")

    try:
        paths = compute_event_study(all_events, asset)
    except Exception as e:
        logger.error(f"Error computing event study for {asset}: {e}")
        raise HTTPException(status_code=500, detail="Internal error computing event study. Please try again later.")

    return {
        "paths": [p.to_dict() for p in paths]
    }


class ReportRequest(BaseModel):
    event_ids: list[str]
    assets: list[str]
    include_scatter: bool
    include_study: bool


@app.post("/report")
async def generate_report(req: ReportRequest):
    """
    Generates and returns the macro impact PDF report.
    """
    import io

    if not req.event_ids:
        raise HTTPException(status_code=400, detail="At least one event_id must be selected.")
    if not req.assets:
        raise HTTPException(status_code=400, detail="At least one asset class must be selected.")
    if len(req.event_ids) > 30:
        raise HTTPException(
            status_code=400,
            detail="Maximum 30 events allowed per report to prevent timeout."
        )
        
    # Validate asset names
    VALID_ASSETS = {"NIFTY", "USDINR", "VIX", "GSEC"}
    invalid = [a for a in req.assets if a not in VALID_ASSETS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid assets: {invalid}. Must be one of {sorted(VALID_ASSETS)}."
        )
        
    try:
        loop = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            None,
            generate_pdf,
            req.event_ids,
            req.assets,
            req.include_scatter,
            req.include_study,
        )
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=macro-impact-report-{date.today().isoformat()}.pdf"
            }
        )
    except Exception as e:
        logger.error(f"Error generating PDF report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate PDF report")


