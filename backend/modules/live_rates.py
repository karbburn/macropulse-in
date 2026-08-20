# backend/modules/live_rates.py

import logging
import pandas as pd
import yfinance as yf
from pathlib import Path
from modules import rbi_dbie


logger = logging.getLogger(__name__)
DATA_DIR = Path(__file__).parent.parent / "data"

def get_latest_repo_rate() -> dict:
    """
    Read mpc_calendar.csv, return the most recent repo rate after decision.
    
    mpc_calendar.csv has columns:
      id, date, time_ist, decision, basis_points, repo_rate_after, notes
    
    Sort by date descending, take first row.
    Return: { "rate": 5.50, "decision": "cut", "date": "2025-06-06" }
    """
    df = pd.read_csv(DATA_DIR / "mpc_calendar.csv")
    if df.empty:
        return {"rate": None, "decision": None, "date": None}
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date", ascending=False)
    latest = df.iloc[0]
    return {
        "rate": float(latest["repo_rate_after"]) if pd.notna(latest["repo_rate_after"]) else None,
        "decision": str(latest["decision"]),
        "date": str(latest["date"].date())
    }


from modules.event_calendar import load_all_events

def get_latest_cpi() -> dict:
    """
    Return the most recent CPI actual from Supabase (via load_all_events),
    falling back to RBI DBIE CSV.
    """
    try:
        events = load_all_events()
        cpi_events = [e for e in events if e.event_type == "CPI" and e.actual is not None]
        if cpi_events:
            latest = cpi_events[0]
            return {
                "actual": round(float(latest.actual), 2),
                "date": str(latest.date)
            }
    except Exception as e:
        logger.warning(f"[live_rates] Error getting latest CPI from event calendar: {e}")
        
    return rbi_dbie.get_latest_cpi()


def get_latest_iip() -> dict:
    """
    Return the most recent IIP actual from Supabase (via load_all_events),
    falling back to RBI DBIE CSV.
    """
    try:
        events = load_all_events()
        iip_events = [e for e in events if e.event_type == "IIP" and e.actual is not None]
        if iip_events:
            latest = iip_events[0]
            return {
                "actual": round(float(latest.actual), 2),
                "date": str(latest.date)
            }
    except Exception as e:
        logger.warning(f"[live_rates] Error getting latest IIP from event calendar: {e}")
        
    return rbi_dbie.get_latest_iip()



def _fetch_nifty_close() -> tuple[float, float, str] | None:
    """
    Attempt to fetch the latest Nifty 50 close + day-over-day change.
    Returns (latest_close, prev_close, date_str) or None on failure.
    """
    # Primary: yfinance download
    try:
        df = yf.download("^NSEI", period="5d", interval="1d", progress=False, auto_adjust=False)
        if not df.empty and "Close" in df.columns:
            closes = df["Close"].dropna()
            if len(closes) >= 1:
                latest_close = float(closes.iloc[-1])
                prev_close = float(closes.iloc[-2]) if len(closes) >= 2 else latest_close
                return latest_close, prev_close, str(df.index[-1].date())
    except Exception as e:
        logger.warning(f"[live_rates] yfinance download error: {e}")

    # Fallback: Ticker.history (different code path, sometimes more reliable)
    try:
        ticker = yf.Ticker("^NSEI")
        hist = ticker.history(period="5d", interval="1d", auto_adjust=False)
        if not hist.empty and "Close" in hist.columns:
            closes = hist["Close"].dropna()
            if len(closes) >= 1:
                latest_close = float(closes.iloc[-1])
                prev_close = float(closes.iloc[-2]) if len(closes) >= 2 else latest_close
                return latest_close, prev_close, str(hist.index[-1].date())
    except Exception as e:
        logger.warning(f"[live_rates] yfinance Ticker.history error: {e}")

    return None


def get_latest_nifty() -> dict:
    """
    Fetch latest Nifty 50 close price from yfinance, with retry + fallback.
    Use period="5d" interval="1d" to get recent daily closes.
    Take the last available close.

    Return: { "price": 24532.15, "change_pct": 0.43, "date": "2025-06-06" }
    On any error, return: { "price": null, "change_pct": null, "date": null }
    """
    SLEEP = 1.0
    for attempt in range(2):
        try:
            result = _fetch_nifty_close()
            if result is None:
                if attempt == 0:
                    logger.warning("[live_rates] Nifty fetch returned no data, retrying once.")
                    if SLEEP:
                        import time
                        time.sleep(SLEEP)
                    continue
                return {"price": None, "change_pct": None, "date": None}

            latest_close, prev_close, latest_date = result
            if latest_close is None or prev_close is None:
                return {"price": None, "change_pct": None, "date": None}

            change_pct = round(((latest_close - prev_close) / prev_close) * 100, 2)
            return {
                "price": round(latest_close, 2),
                "change_pct": change_pct,
                "date": latest_date,
            }
        except Exception as e:
            logger.warning(f"[live_rates] yfinance error (attempt {attempt + 1}): {e}")
            if attempt == 0 and SLEEP:
                import time
                time.sleep(SLEEP)
                continue
            return {"price": None, "change_pct": None, "date": None}

    return {"price": None, "change_pct": None, "date": None}
