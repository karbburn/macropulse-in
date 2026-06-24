# backend/modules/rbi_dbie.py
"""
RBI DBIE data reader.
Reads pre-downloaded CSV files for CPI and IIP actuals.
These CSVs are seeded manually and updated by the nightly job via MOSPI scraper.

No API key required. No rate limits.
"""

import pandas as pd
from pathlib import Path
from datetime import date
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "data"


def load_cpi_actuals() -> pd.DataFrame:
    """
    Load CPI YoY actuals from rbi_dbie_cpi_raw.csv.
    
    Expected columns after processing: date (YYYY-MM-DD), cpi_yoy (float)
    date = the release reference month (e.g. 2024-05-01 = CPI for May 2024)
    
    Returns DataFrame sorted by date ascending.
    If file missing, return empty DataFrame with correct columns.
    """
    path = DATA_DIR / "rbi_dbie_cpi_raw.csv"
    if not path.exists():
        print("[rbi_dbie] WARNING: rbi_dbie_cpi_raw.csv not found. Run manual seed first.")
        return pd.DataFrame(columns=["date", "cpi_yoy"])
    
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    
    # Compute YoY if raw index column exists but yoy doesn't
    if "cpi_yoy" not in df.columns and "cpi_index" in df.columns:
        df = df.sort_values("date")
        df["cpi_yoy"] = df["cpi_index"].pct_change(12) * 100
    
    return df.sort_values("date").dropna(subset=["cpi_yoy"])


def load_iip_actuals() -> pd.DataFrame:
    """
    Load IIP YoY actuals from rbi_dbie_iip_raw.csv.
    
    Expected columns: date (YYYY-MM-DD), iip_yoy (float)
    
    Returns DataFrame sorted by date ascending.
    """
    path = DATA_DIR / "rbi_dbie_iip_raw.csv"
    if not path.exists():
        print("[rbi_dbie] WARNING: rbi_dbie_iip_raw.csv not found. Run manual seed first.")
        return pd.DataFrame(columns=["date", "iip_yoy"])
    
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    
    if "iip_yoy" not in df.columns and "iip_index" in df.columns:
        df = df.sort_values("date")
        df["iip_yoy"] = df["iip_index"].pct_change(12) * 100
    
    return df.sort_values("date").dropna(subset=["iip_yoy"])


def get_cpi_actual_for_date(reference_date: date) -> Optional[float]:
    """
    Given a CPI event's reference month, return the actual CPI YoY value.
    reference_date: first day of the reference month (e.g. date(2024, 5, 1))
    
    Returns float or None if not found.
    """
    df = load_cpi_actuals()
    if df.empty:
        return None
    
    # Match by year and month
    mask = (
        (df["date"].dt.year == reference_date.year) &
        (df["date"].dt.month == reference_date.month)
    )
    matches = df[mask]
    if matches.empty:
        return None
    
    return float(matches.iloc[0]["cpi_yoy"])


def get_iip_actual_for_date(reference_date: date) -> Optional[float]:
    """Same as get_cpi_actual_for_date but for IIP."""
    df = load_iip_actuals()
    if df.empty:
        return None
    
    mask = (
        (df["date"].dt.year == reference_date.year) &
        (df["date"].dt.month == reference_date.month)
    )
    matches = df[mask]
    if matches.empty:
        return None
    
    return float(matches.iloc[0]["iip_yoy"])


def get_latest_cpi() -> dict:
    """
    Return the most recent CPI actual.
    Used by /api/latest-rates endpoint.
    Returns: { "actual": 4.88, "date": "2024-05-01" }
    """
    df = load_cpi_actuals()
    if df.empty:
        return {"actual": None, "date": None}
    
    latest = df.iloc[-1]
    return {
        "actual": round(float(latest["cpi_yoy"]), 2),
        "date": str(latest["date"].date())
    }


def get_latest_iip() -> dict:
    """Return the most recent IIP actual."""
    df = load_iip_actuals()
    if df.empty:
        return {"actual": None, "date": None}
    
    latest = df.iloc[-1]
    return {
        "actual": round(float(latest["iip_yoy"]), 2),
        "date": str(latest["date"].date())
    }
