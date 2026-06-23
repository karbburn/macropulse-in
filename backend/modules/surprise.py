"""
Surprise Calculator Module

Computes economic calendar surprise scores using Finnhub API (for CPI consensus)
and consensus.csv. Standardizes the surprise score against historical std.
"""

import logging
import requests
import pandas as pd
from datetime import date, datetime
from modules.event_calendar import MacroEvent

logger = logging.getLogger(__name__)

def fetch_finnhub_consensus(event: MacroEvent, api_key: str) -> float | None:
    """
    Call Finnhub economic calendar API for CPI events only.
    Return consensus estimate if found, None otherwise.
    Never crash.
    """
    if event.event_type != "CPI":
        return None
    
    if not api_key:
        logger.debug("Finnhub API key not provided.")
        return None

    url = "https://finnhub.io/api/v1/calendar/economic"
    params = {
        "from": event.date.isoformat(),
        "to": event.date.isoformat(),
        "token": api_key
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code != 200:
            logger.warning(f"Finnhub API error: HTTP {response.status_code}")
            return None
        
        data = response.json()
        calendar = data.get("economicCalendar", [])
        for item in calendar:
            country = str(item.get("country", "")).upper()
            event_name = str(item.get("event", "")).lower()
            if country in ("IN", "INDIA") and "cpi" in event_name:
                estimate = item.get("estimate")
                if estimate is None:
                    estimate = item.get("forecast")
                if estimate is not None:
                    try:
                        return float(estimate)
                    except (ValueError, TypeError):
                        pass
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch Finnhub consensus: {e}")
        return None

def get_consensus(event: MacroEvent, finnhub_key: str, consensus_df: pd.DataFrame) -> float | None:
    """
    Priority:
    1. Finnhub (CPI only)
    2. consensus.csv lookup by event_id
    3. Return None
    """
    # 1. Finnhub (CPI only)
    if event.event_type == "CPI" and finnhub_key:
        val = fetch_finnhub_consensus(event, finnhub_key)
        if val is not None:
            return val
            
    # 2. consensus_df lookup
    if consensus_df is not None and not consensus_df.empty:
        matches = consensus_df[consensus_df["event_id"] == event.id]
        if not matches.empty:
            val = matches.iloc[0].get("consensus_value")
            if pd.notna(val) and val is not None and str(val).strip() != "":
                try:
                    return float(val)
                except (ValueError, TypeError):
                    pass
    
    return None

def compute_historical_std(
    event: MacroEvent,
    all_events: list[MacroEvent],
    window: int = 12
) -> float | None:
    """
    Compute std of (actual - consensus) over last 12 events of the same type.
    Return None if fewer than 4 events available.
    """
    # Filter events of same type, strictly older than target event
    hist_events = [e for e in all_events if e.event_type == event.event_type and e.date < event.date]
    # Sort newest first
    hist_events.sort(key=lambda e: e.date, reverse=True)
    
    diffs = []
    for e in hist_events:
        act = e.actual
        con = e.consensus
        
        # For IIP, compute trailing 6-month actuals if consensus is None
        if event.event_type == "IIP" and con is None:
            trailing = [h for h in all_events if h.event_type == "IIP" and h.date < e.date and h.actual is not None]
            trailing.sort(key=lambda h: h.date, reverse=True)
            if len(trailing) >= 1:
                con = sum(h.actual for h in trailing[:6]) / min(len(trailing), 6)
                
        if act is not None and con is not None:
            diffs.append(act - con)
            if len(diffs) >= window:
                break
                
    if len(diffs) < 4:
        return None
        
    return float(pd.Series(diffs).std())

def compute_surprise_score(
    event: MacroEvent,
    all_events: list[MacroEvent],
    finnhub_key: str,
    consensus_df: pd.DataFrame
) -> float | None:
    """
    Full surprise score pipeline.
    Surprise = (actual - consensus) / hist_std
    Return unnormalized if hist_std is None.
    Return None if no consensus.
    """
    # MPC events do not have a numeric actual/consensus surprise score
    if event.event_type == "MPC":
        return None

    con = event.consensus
    if con is None:
        con = get_consensus(event, finnhub_key, consensus_df)
    
    # IIP consensus is trailing 6-month mean actuals
    if event.event_type == "IIP" and con is None:
        trailing = [e for e in all_events if e.event_type == "IIP" and e.date < event.date and e.actual is not None]
        trailing.sort(key=lambda e: e.date, reverse=True)
        if len(trailing) >= 1:
            con = sum(e.actual for e in trailing[:6]) / min(len(trailing), 6)

    # Set the resolved consensus back to the object for reference
    if con is not None:
        event.consensus = round(con, 4)

    if con is None or event.actual is None:
        return None
        
    raw_surprise = event.actual - con
    
    hist_std = compute_historical_std(event, all_events)
    if hist_std is None or hist_std == 0:
        return round(raw_surprise, 4)
        
    return round(raw_surprise / hist_std, 4)
