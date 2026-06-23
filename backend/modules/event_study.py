"""
Event Study Module

Computes average indexed market paths in a 5-day window [-2, -1, 0, 1, 2]
around MPC decisions (hike, cut, hold).
"""

import logging
from dataclasses import dataclass, asdict
from datetime import date, timedelta
import pandas as pd
import numpy as np

from modules.event_calendar import MacroEvent
from modules.market_snapshot import get_yfinance_data, TICKERS
from modules.cache import get_cached_study, cache_study

logger = logging.getLogger(__name__)

@dataclass
class EventStudyPath:
    decision_type: str         # "hike" | "cut" | "hold"
    asset: str
    days: list[int]            # [-2, -1, 0, 1, 2]
    mean_indexed: list[float]  # Indexed to 100 at T-0
    upper_band: list[float]    # mean + 1 std
    lower_band: list[float]    # mean - 1 std
    event_count: int

    def to_dict(self) -> dict:
        return asdict(self)


def compute_event_study(
    events: list[MacroEvent],
    asset: str,
    decision_types: list[str] = None
) -> list[EventStudyPath]:
    """
    Computes average indexed close price paths for NIFTY or USDINR
    around MPC rate hike, cut, or hold decisions.
    """
    if decision_types is None:
        decision_types = ["hike", "cut", "hold"]

    asset = asset.upper()
    ticker = TICKERS.get(asset)
    if not ticker:
        logger.error(f"Invalid asset for event study: {asset}")
        return []

    # 1. Filter events to MPC only
    mpc_events = [e for e in events if e.event_type == "MPC" and e.outcome is not None]
    
    results: list[EventStudyPath] = []

    for dec_type in decision_types:
        # Check cache first
        cached = get_cached_study(asset, dec_type)
        if cached is not None:
            logger.info(f"Using cached study path for {asset}/{dec_type}")
            try:
                results.append(EventStudyPath(
                    decision_type=cached["decision_type"],
                    asset=cached["asset"],
                    days=cached["days"],
                    mean_indexed=cached["mean_indexed"],
                    upper_band=cached["upper_band"],
                    lower_band=cached["lower_band"],
                    event_count=cached["event_count"]
                ))
                continue
            except KeyError as e:
                logger.warning(f"Error parsing cached study path: {e} - recomputing.")

        # Filter events by decision type
        if dec_type == "hike":
            dec_events = [e for e in mpc_events if e.outcome.startswith("hike")]
        elif dec_type == "cut":
            dec_events = [e for e in mpc_events if e.outcome.startswith("cut")]
        elif dec_type == "hold":
            dec_events = [e for e in mpc_events if e.outcome == "hold"]
        else:
            dec_events = []

        logger.info(f"Computing study path for {asset}/{dec_type} with {len(dec_events)} events...")

        paths = []
        skipped_events = []

        for event in dec_events:
            # Query yfinance: event_date - 10 days to event_date + 10 days
            start_date = event.date - timedelta(days=10)
            end_date = event.date + timedelta(days=10)
            
            # Fetch daily data
            df = get_yfinance_data(ticker, start_date, end_date, interval="1d", asset=asset)
            if df.empty:
                skipped_events.append((event.id, "No price data returned from yfinance"))
                continue

            # Identify trading days index
            df_dates = list(pd.to_datetime(df.index).date)
            deltas = [abs((d - event.date).days) for d in df_dates]
            min_delta = min(deltas)
            if min_delta > 3:
                skipped_events.append((event.id, f"No trading day close to event date (min_delta={min_delta} days)"))
                continue

            idx = deltas.index(min_delta)

            # Ensure we have T-2 to T+2 trading days
            if idx - 2 < 0 or idx + 2 >= len(df):
                skipped_events.append((event.id, f"Insufficient trading days buffer around event index {idx} (total rows={len(df)})"))
                continue

            # Close prices
            try:
                prices = [float(df.iloc[idx + offset]["Close"]) for offset in [-2, -1, 0, 1, 2]]
                if any(np.isnan(p) for p in prices):
                    skipped_events.append((event.id, "NaN values present in price window"))
                    continue
                
                t0_price = prices[2]
                if t0_price == 0:
                    skipped_events.append((event.id, "T=0 price is zero"))
                    continue

                # Index to 100 at T=0
                indexed_path = [(p / t0_price) * 100 for p in prices]
                paths.append(indexed_path)
            except Exception as e:
                skipped_events.append((event.id, f"Error extracting price series: {str(e)}"))
                continue

        if skipped_events:
            logger.info(f"Skipped {len(skipped_events)} events for {dec_type}: {skipped_events}")

        if not paths:
            # No valid paths, return empty study path object with 0 count
            logger.warning(f"No valid paths computed for {asset}/{dec_type}")
            path_obj = EventStudyPath(
                decision_type=dec_type,
                asset=asset,
                days=[-2, -1, 0, 1, 2],
                mean_indexed=[100.0] * 5,
                upper_band=[100.0] * 5,
                lower_band=[100.0] * 5,
                event_count=0
            )
            results.append(path_obj)
            continue

        # Compute mean and standard deviation per day offset across all events
        paths_arr = np.array(paths)  # shape: (N, 5)
        mean_indexed = np.mean(paths_arr, axis=0)
        
        if paths_arr.shape[0] >= 2:
            std_indexed = np.std(paths_arr, axis=0, ddof=1)
        else:
            std_indexed = np.zeros(5)

        # Handle any NaN standard deviation (shouldn't happen with ddof=1 and N >= 2, unless values are identical)
        std_indexed = np.nan_to_num(std_indexed)

        mean_list = [round(float(m), 4) for m in mean_indexed]
        upper_list = [round(float(mean_indexed[i] + std_indexed[i]), 4) for i in range(5)]
        lower_list = [round(float(mean_indexed[i] - std_indexed[i]), 4) for i in range(5)]

        path_obj = EventStudyPath(
            decision_type=dec_type,
            asset=asset,
            days=[-2, -1, 0, 1, 2],
            mean_indexed=mean_list,
            upper_band=upper_list,
            lower_band=lower_list,
            event_count=len(paths)
        )

        # Cache the result
        cache_study(asset, dec_type, path_obj.to_dict())
        results.append(path_obj)

    return results
