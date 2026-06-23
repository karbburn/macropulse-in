"""
Market Snapshot Engine

Pulls intraday / daily price data from yfinance for four Indian assets
around each macro event, computes percentage changes relative to the
T-60 min baseline, and caches results in Supabase.

Assets: Nifty 50, USD/INR, India VIX, G-Sec proxy (SBI Magnum Gilt).

Rate-limiting: every yfinance call is preceded by a 1-second sleep.
"""

import logging
import time as time_module
from dataclasses import dataclass, asdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

import pandas as pd
import requests
import yfinance as yf

from modules.cache import get_cached_snapshot, cache_snapshot
from modules.event_calendar import MacroEvent

logger = logging.getLogger(__name__)

# Create a global requests session to mimic a browser to prevent rate limits / Yahoo blocking.
_session = requests.Session()
_session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
})


# --------------------------------------------------------------------------- #
#  Constants (from TechSpec Section 5.1 & Claude Guide Stage 2)
# --------------------------------------------------------------------------- #

TICKERS: dict[str, str] = {
    "NIFTY":  "^NSEI",
    "USDINR": "USDINR=X",         # USDINR=X more reliable than INR=X
    "VIX":    "^INDIAVIX",
    "GSEC":   "0P0001F4ZH.BO",   # SBI Magnum Gilt as 10Y proxy
}

# Fallback tickers if primary fails
_FALLBACK_TICKERS: dict[str, list[str]] = {
    "NIFTY":  ["^NSEI", "NSEI.NS"],
    "USDINR": ["USDINR=X", "INR=X"],
    "VIX":    ["^INDIAVIX"],
    "GSEC":   ["0P0001F4ZH.BO", "^IRX"],
}


WINDOW_OFFSETS: dict[str, timedelta] = {
    "T-60":  timedelta(hours=-1),
    "T0":    timedelta(minutes=0),
    "T+30":  timedelta(minutes=30),
    "T+2H":  timedelta(hours=2),
    "T+1D":  timedelta(days=1),
}

# Default announcement times (IST) when event.time is None
DEFAULT_TIMES: dict[str, time] = {
    "MPC": time(10, 0),     # RBI typically announces at 10:00 IST
    "CPI": time(17, 30),    # MoSPI typically releases at 17:30 IST
    "IIP": time(17, 30),
}

# IST = UTC+05:30
_IST = timezone(timedelta(hours=5, minutes=30))


# --------------------------------------------------------------------------- #
#  MarketSnapshot dataclass (TechSpec Section 3.2)
# --------------------------------------------------------------------------- #

@dataclass
class MarketSnapshot:
    """Snapshot of an asset's price across five time windows around an event."""
    event_id: str
    asset: str                # "NIFTY" | "USDINR" | "VIX" | "GSEC"
    windows: dict             # Keys: "T-60", "T0", "T+30", "T+2H", "T+1D"
    computed_at: datetime


# --------------------------------------------------------------------------- #
#  Resolution helper
# --------------------------------------------------------------------------- #

def get_resolution(event_date: date, asset: str) -> str:
    """
    Determine whether to fetch hourly or daily data from yfinance.

    Rules:
      - VIX: always "1d" (no reliable intraday data)
      - Events within the last 58 days: "1h" (yfinance limit is ~60 days)
      - Older events: "1d"

    Args:
        event_date: The event's calendar date.
        asset: One of NIFTY, USDINR, VIX, GSEC.

    Returns:
        "1h" or "1d".
    """
    if asset == "VIX":
        return "1d"

    days_ago = (date.today() - event_date).days
    if days_ago <= 58:
        return "1h"
    return "1d"


# --------------------------------------------------------------------------- #
#  yfinance data fetcher (rate-limited)
# --------------------------------------------------------------------------- #

def _fetch_with_ticker_history(
    ticker: str,
    start: date,
    end: date,
    interval: str,
) -> pd.DataFrame:
    """
    Fetch OHLCV data using yf.Ticker().history() — more reliable for
    Indian tickers than yf.download() which uses a different HTTP path.

    Always preceded by a 1-second sleep for rate-limiting.
    """
    time_module.sleep(1)  # rate-limit — no exceptions
    try:
        t = yf.Ticker(ticker, session=_session)
        df = t.history(
            start=start,
            end=end + timedelta(days=1),  # yfinance end is exclusive
            interval=interval,
        )
        if df is None:
            return pd.DataFrame()

        # Normalize column names: Ticker.history() returns
        # 'Close', 'Open', etc. directly (no MultiIndex)
        return df
    except Exception as e:
        logger.warning(f"Ticker.history() failed for {ticker}: {e}")
        return pd.DataFrame()


def _fetch_with_download(
    ticker: str,
    start: date,
    end: date,
    interval: str,
) -> pd.DataFrame:
    """
    Fallback: fetch via yf.download().

    Always preceded by a 1-second sleep for rate-limiting.
    """
    time_module.sleep(1)  # rate-limit — no exceptions
    try:
        df = yf.download(
            ticker,
            start=start,
            end=end + timedelta(days=1),
            interval=interval,
            progress=False,
            session=_session,
        )
        if df is None:
            return pd.DataFrame()

        # Handle multi-level columns that yfinance sometimes returns
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        return df
    except Exception as e:
        logger.warning(f"yf.download() failed for {ticker}: {e}")
        return pd.DataFrame()



def get_yfinance_data(
    ticker: str,
    start: date,
    end: date,
    interval: str,
    asset: str = "",
) -> pd.DataFrame:
    """
    Download OHLCV data from yfinance with a mandatory 1-second sleep.

    Uses yf.Ticker().history() first (more reliable for Indian tickers),
    then falls back to yf.download(), then tries fallback tickers.

    Args:
        ticker: Primary yfinance ticker string.
        start: Start date (inclusive).
        end: End date (inclusive).
        interval: "1h" or "1d".
        asset: Asset name for fallback ticker lookup.

    Returns:
        DataFrame with OHLCV columns, or an empty DataFrame on failure.
    """
    # Strategy 1: Ticker.history() with primary ticker
    df = _fetch_with_ticker_history(ticker, start, end, interval)
    if not df.empty:
        return df

    # Strategy 2: yf.download() with primary ticker
    logger.info(f"Retrying {ticker} via yf.download()…")
    df = _fetch_with_download(ticker, start, end, interval)
    if not df.empty:
        return df

    # Strategy 3: Try fallback tickers
    fallbacks = _FALLBACK_TICKERS.get(asset, [])
    for fb_ticker in fallbacks:
        if fb_ticker == ticker:
            continue  # already tried
        logger.info(f"Trying fallback ticker {fb_ticker} for {asset}…")
        df = _fetch_with_ticker_history(fb_ticker, start, end, interval)
        if not df.empty:
            return df

    logger.error(f"All yfinance strategies exhausted for {asset} ({ticker})")
    return pd.DataFrame()


# --------------------------------------------------------------------------- #
#  Candle finder
# --------------------------------------------------------------------------- #

def find_closest_candle(
    df: pd.DataFrame,
    target_time: datetime,
    max_gap: timedelta = timedelta(hours=2),
) -> pd.Series | None:
    """
    Find the row in *df* whose index timestamp is closest to *target_time*.

    Returns None if:
      - df is empty
      - the closest candle is more than max_gap away from the target

    Args:
        df: DataFrame with a DatetimeIndex (timezone-aware or naive).
        target_time: The target timestamp to search for.
        max_gap: Maximum allowed difference between closest candle and target_time.

    Returns:
        The closest row as a Series, or None.
    """
    if df.empty:
        return None

    try:
        # Ensure the index is a DatetimeIndex
        if not isinstance(df.index, pd.DatetimeIndex):
            return None

        # Make both sides tz-aware or tz-naive for comparison
        idx = df.index
        if idx.tz is not None and target_time.tzinfo is None:
            target_time = target_time.replace(tzinfo=idx.tz)
        elif idx.tz is None and target_time.tzinfo is not None:
            target_time = target_time.replace(tzinfo=None)

        # Compute absolute time differences
        deltas = abs(idx - target_time)
        min_idx = deltas.argmin()
        closest_delta = deltas[min_idx]

        # Reject if gap > max_gap
        if closest_delta > max_gap:
            logger.debug(
                f"Closest candle is {closest_delta} from target "
                f"{target_time} — too far, returning None"
            )
            return None

        return df.iloc[min_idx]

    except Exception as e:
        logger.error(f"Error finding closest candle: {e}")
        return None


# --------------------------------------------------------------------------- #
#  Percentage-change helper
# --------------------------------------------------------------------------- #

def compute_pct_change(price: float, baseline_price: float) -> float | None:
    """
    Compute percentage change from a baseline, rounded to 4 decimal places.

    Formula: ((price / baseline_price) - 1) * 100

    Args:
        price: Current price.
        baseline_price: Reference price (T-60).

    Returns:
        Percentage change, or 0.0 if baseline is zero.
    """
    if baseline_price == 0:
        logger.warning("Baseline price is zero, cannot compute percentage change")
        return None
    return round(((price / baseline_price) - 1) * 100, 4)


# --------------------------------------------------------------------------- #
#  Core snapshot computation
# --------------------------------------------------------------------------- #

def _compute_snapshot(event: MacroEvent, asset: str) -> dict | None:
    """
    Compute a market snapshot for one asset around one event.

    Steps:
      1. Determine the event's announcement time in IST.
      2. Pick resolution (1h vs 1d) based on event age + asset type.
      3. Download OHLCV data around the event window.
      4. For each of the five time windows, find the closest candle.
      5. Compute % change from the T-60 baseline price.

    Returns:
        Dict with keys "T-60", "T0", "T+30", "T+2H", "T+1D", each
        mapping to {"price", "pct_change_from_T60", "resolution"}.
        Returns None if data is completely unavailable.
    """
    ticker = TICKERS.get(asset)
    if ticker is None:
        logger.error(f"Unknown asset: {asset}")
        return None

    # Determine announcement datetime in IST
    event_time = event.time or DEFAULT_TIMES.get(event.event_type, time(10, 0))
    event_dt_ist = datetime.combine(event.date, event_time, tzinfo=_IST)

    # Determine resolution
    resolution = get_resolution(event.date, asset)

    # Download data: event_date - 3 days to event_date + 3 days
    # (extra buffer so T+1D and weekends/holidays are covered)
    start = event.date - timedelta(days=3)
    end = event.date + timedelta(days=3)

    df = get_yfinance_data(ticker, start, end, resolution, asset=asset)

    if df.empty:
        logger.warning(
            f"No yfinance data for {asset} ({ticker}) "
            f"around {event.date} at {resolution} resolution"
        )
        return None

    # Build the snapshot windows
    if resolution == "1d":
        df_dates = list(pd.to_datetime(df.index).date)
        deltas = [abs((d - event.date).days) for d in df_dates]
        if not deltas:
            return None
        min_delta = min(deltas)
        if min_delta > 3:
            logger.warning(f"No daily candle within 3 days of event date {event.date} for {asset}")
            return None
        
        idx = deltas.index(min_delta)
        
        def get_row_price(i):
            if 0 <= i < len(df):
                row = df.iloc[i]
                if "Close" in row:
                    return float(row["Close"])
            return None

        p_prev = get_row_price(idx - 1)
        p_curr = get_row_price(idx)
        p_next = get_row_price(idx + 1)
        
        windows = {}
        
        # T-60 (baseline)
        windows["T-60"] = {
            "price": round(p_prev, 4) if p_prev is not None else None,
            "pct_change_from_T60": 0.0 if p_prev is not None else None,
            "resolution": "1d",
        }
        
        # T0, T+30, T+2H (all map to event day close)
        for w in ["T0", "T+30", "T+2H"]:
            windows[w] = {
                "price": round(p_curr, 4) if p_curr is not None else None,
                "pct_change_from_T60": compute_pct_change(p_curr, p_prev) if (p_curr is not None and p_prev is not None) else None,
                "resolution": "1d",
            }
            
        # T+1D (maps to next trading day close)
        windows["T+1D"] = {
            "price": round(p_next, 4) if p_next is not None else None,
            "pct_change_from_T60": compute_pct_change(p_next, p_prev) if (p_next is not None and p_prev is not None) else None,
            "resolution": "1d",
        }
        
        return windows

    # Hourly resolution
    windows: dict[str, dict | None] = {}
    baseline_price: float | None = None

    for window_name, offset in WINDOW_OFFSETS.items():
        if window_name == "T+1D":
            # T+1D: use next trading day's close — always daily resolution.
            # Allow up to 3 days gap to cross weekends / holidays.
            target_dt = event_dt_ist + timedelta(days=1)
            candle = find_closest_candle(df, target_dt, max_gap=timedelta(days=3))
            window_resolution = "1d"
        else:
            target_dt = event_dt_ist + offset
            candle = find_closest_candle(df, target_dt, max_gap=timedelta(hours=2))
            window_resolution = "1hr"

        if candle is not None and "Close" in candle.index:
            price = float(candle["Close"])

            # Set baseline from T-60
            if window_name == "T-60":
                baseline_price = price

            pct_change = 0.0
            if baseline_price is not None and window_name != "T-60":
                pct_change = compute_pct_change(price, baseline_price)
            
            windows[window_name] = {
                "price": round(price, 4),
                "pct_change_from_T60": pct_change,
                "resolution": window_resolution,
            }
        else:
            windows[window_name] = {
                "price": None,
                "pct_change_from_T60": None,
                "resolution": window_resolution,
            }

    # If even T-60 is None we got nothing useful
    if windows.get("T-60", {}).get("price") is None:
        logger.warning(f"No baseline (T-60) price for {asset} / {event.id}")
    
    return windows



# --------------------------------------------------------------------------- #
#  Public API — cache-through snapshot getter
# --------------------------------------------------------------------------- #

def get_snapshot_with_cache(event: MacroEvent, asset: str) -> dict | None:
    """
    Get a market snapshot for an event + asset, using cache when available.

    Flow:
      1. Check Supabase cache → return if found.
      2. Compute via yfinance.
      3. Cache the result in Supabase.
      4. Return the computed snapshot.

    Args:
        event: The MacroEvent to compute around.
        asset: One of "NIFTY", "USDINR", "VIX", "GSEC".

    Returns:
        Window dict or None if data is completely unavailable.
    """
    # 1. Try cache
    cached = get_cached_snapshot(event.id, asset)
    if cached is not None:
        logger.info(f"Using cached snapshot for {event.id}/{asset}")
        return cached

    # 2. Compute fresh
    logger.info(f"Computing snapshot for {event.id}/{asset} via yfinance…")
    snapshot_data = _compute_snapshot(event, asset)

    if snapshot_data is None:
        return None

    # 3. Cache the result (best-effort)
    cache_snapshot(event.id, asset, snapshot_data)

    # 4. Return
    return snapshot_data


def get_all_snapshots(event: MacroEvent) -> dict[str, dict | None]:
    """
    Compute (or retrieve from cache) snapshots for ALL four assets.

    Returns:
        Dict keyed by asset name → window dict.
        Missing assets are mapped to None.
    """
    snapshots: dict[str, dict | None] = {}
    for asset in TICKERS:
        try:
            snapshots[asset] = get_snapshot_with_cache(event, asset)
        except Exception as e:
            logger.error(f"Error computing snapshot for {event.id}/{asset}: {e}")
            snapshots[asset] = None
    return snapshots
