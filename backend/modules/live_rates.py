# backend/modules/live_rates.py

import logging
import pandas as pd
import yfinance as yf
import time
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



def get_latest_nifty() -> dict:
    """
    Fetch latest Nifty 50 close price from yfinance.
    Use period="5d" interval="1d" to get recent daily closes.
    Take the last available close.
    
    sleep(1) before yfinance call — always.
    
    Return: { "price": 24532.15, "change_pct": 0.43, "date": "2025-06-06" }
    On any error, return: { "price": null, "change_pct": null, "date": null }
    """
    try:
        time.sleep(1)
        df = yf.download("^NSEI", period="5d", interval="1d", progress=False)
        if df.empty:
            return {"price": None, "change_pct": None, "date": None}
        
        # yfinance Close can be a Series or a DataFrame depending on structure
        latest_close = float(df["Close"].iloc[-1])
        prev_close = float(df["Close"].iloc[-2]) if len(df) >= 2 else latest_close
        change_pct = round(((latest_close - prev_close) / prev_close) * 100, 2)
        latest_date = str(df.index[-1].date())
        
        return {
            "price": round(latest_close, 2),
            "change_pct": change_pct,
            "date": latest_date
        }
    except Exception as e:
        logger.warning(f"[live_rates] yfinance error: {e}")
        return {"price": None, "change_pct": None, "date": None}
