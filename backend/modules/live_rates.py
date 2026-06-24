# backend/modules/live_rates.py

import logging
import pandas as pd
import yfinance as yf
import time
from pathlib import Path

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


def get_latest_cpi() -> dict:
    """
    Read consensus.csv, filter for event_type == CPI, return most recent actual.
    
    consensus.csv has columns:
      event_id, event_type, date, actual_value, consensus_value, source, notes
    
    event_id format: CPI-YYYY-MM-DD
    Extract date from event_id, sort descending, take first row.
    
    Return: { "actual": 4.88, "date": "2024-06-12" }
    If no CPI rows exist, return { "actual": null, "date": null }
    """
    df = pd.read_csv(DATA_DIR / "consensus.csv")
    cpi = df[df["event_type"] == "CPI"].copy()
    if cpi.empty:
        return {"actual": None, "date": None}
    
    # Extract date from event_id (format: CPI-YYYY-MM-DD)
    cpi["date"] = pd.to_datetime(
        cpi["event_id"].str.replace("CPI-", ""), errors="coerce"
    )
    cpi = cpi.dropna(subset=["date"]).sort_values("date", ascending=False)
    latest = cpi.iloc[0]
    
    # Use actual_value (not consensus_value) — consensus has NaNs for older CPI rows
    return {
        "actual": float(latest["actual_value"]) if pd.notna(latest["actual_value"]) else None,
        "date": str(latest["date"].date())
    }


def get_latest_iip() -> dict:
    """
    Same pattern as get_latest_cpi() but filter event_type == IIP.
    Return: { "actual": 5.9, "date": "2024-06-12" }
    """
    df = pd.read_csv(DATA_DIR / "consensus.csv")
    iip = df[df["event_type"] == "IIP"].copy()
    if iip.empty:
        return {"actual": None, "date": None}
    
    iip["date"] = pd.to_datetime(
        iip["event_id"].str.replace("IIP-", ""), errors="coerce"
    )
    iip = iip.dropna(subset=["date"]).sort_values("date", ascending=False)
    latest = iip.iloc[0]
    
    # Use actual_value (not consensus_value) — consensus has NaNs for older IIP rows
    return {
        "actual": float(latest["actual_value"]) if pd.notna(latest["actual_value"]) else None,
        "date": str(latest["date"].date())
    }


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
