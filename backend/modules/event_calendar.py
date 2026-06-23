"""
Event Calendar Module
Loads, merges, and filters all macro events (MPC, CPI, IIP).

Data sources:
- MPC events: backend/data/mpc_calendar.csv (hardcoded, manual update)
- CPI/IIP events: backend/data/consensus.csv (manual + API supplement)
"""

import csv
import logging
import os
from dataclasses import dataclass, asdict
from datetime import date, time
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

# Resolve data directory relative to this module
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@dataclass
class MacroEvent:
    """Represents a single macro event (MPC decision, CPI print, or IIP release)."""
    id: str                             # "MPC-2024-06-07"
    event_type: str                     # "MPC" | "CPI" | "IIP"
    date: date                          # Event date
    time: time | None                   # Announcement time (IST), None if unknown
    outcome: str | None                 # MPC: "hike+25" | "cut-25" | "hold"; CPI: "5.1"; IIP: "3.2"
    actual: float | None                # Numeric actual value
    consensus: float | None             # Consensus estimate (None if unavailable)
    surprise_score: float | None        # Computed: (actual - consensus) / hist_std
    notes: str | None                   # E.g. "Unanimous decision" or "Monsoon CPI spike"

    def to_dict(self) -> dict:
        """Convert to JSON-serializable dictionary."""
        result = asdict(self)
        result["date"] = self.date.isoformat()
        result["time"] = self.time.isoformat() if self.time else None
        return result


# Module-level cache for load_all_events to avoid blocking Finnhub API calls on every request
_events_cache: list[MacroEvent] | None = None


def _parse_time(time_str: str) -> time | None:
    """Parse a time string in HH:MM or HH:MM:SS format. Returns None on failure."""
    if not time_str or time_str.strip() == "":
        return None
    try:
        parts = time_str.strip().split(":")
        if len(parts) == 2:
            return time(int(parts[0]), int(parts[1]))
        elif len(parts) == 3:
            return time(int(parts[0]), int(parts[1]), int(parts[2]))
        else:
            logger.warning(f"Could not parse time: {time_str}")
            return None
    except (ValueError, TypeError) as e:
        logger.warning(f"Could not parse time '{time_str}': {e}")
        return None


def _parse_float(value: str) -> float | None:
    """Parse a float from a string, returning None for empty or invalid values."""
    if not value or value.strip() == "":
        return None
    try:
        return float(value.strip())
    except (ValueError, TypeError):
        logger.warning(f"Could not parse float: {value}")
        return None


def _load_mpc_events() -> list[MacroEvent]:
    """Load MPC events from mpc_calendar.csv."""
    csv_path = DATA_DIR / "mpc_calendar.csv"
    events: list[MacroEvent] = []

    if not csv_path.exists():
        logger.error(f"MPC calendar CSV not found at {csv_path}")
        return events

    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    event_date = date.fromisoformat(row["date"].strip())
                    event_time = _parse_time(row.get("time_ist", ""))
                    decision = row.get("decision", "").strip()
                    basis_points = int(row.get("basis_points", "0").strip() or "0")

                    # Build outcome string: "hike+25", "cut-25", "hold"
                    if decision == "hike":
                        outcome = f"hike+{basis_points}"
                    elif decision == "cut":
                        outcome = f"cut-{basis_points}"
                    else:
                        outcome = "hold"

                    event = MacroEvent(
                        id=row["id"].strip(),
                        event_type="MPC",
                        date=event_date,
                        time=event_time,
                        outcome=outcome,
                        actual=None,  # MPC decisions don't have a numeric "actual"
                        consensus=None,
                        surprise_score=None,
                        notes=row.get("notes", "").strip() or None,
                    )
                    events.append(event)
                except (KeyError, ValueError) as e:
                    logger.error(f"Error parsing MPC row: {row} — {e}")
                    continue
    except Exception as e:
        logger.error(f"Failed to read MPC calendar CSV: {e}")

    logger.info(f"Loaded {len(events)} MPC events from {csv_path}")
    return events


def _load_consensus_events() -> list[MacroEvent]:
    """Load CPI and IIP events from consensus.csv."""
    csv_path = DATA_DIR / "consensus.csv"
    events: list[MacroEvent] = []

    if not csv_path.exists():
        logger.error(f"Consensus CSV not found at {csv_path}")
        return events

    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    event_date = date.fromisoformat(row["date"].strip())
                    event_type = row["event_type"].strip()
                    actual = _parse_float(row.get("actual_value", ""))
                    consensus = _parse_float(row.get("consensus_value", ""))

                    # For CPI/IIP, outcome is the actual value as string
                    outcome = str(actual) if actual is not None else None

                    event = MacroEvent(
                        id=row["event_id"].strip(),
                        event_type=event_type,
                        date=event_date,
                        time=None,  # CPI/IIP release times handled by DEFAULT_TIMES in snapshot module
                        outcome=outcome,
                        actual=actual,
                        consensus=consensus,
                        surprise_score=None,  # Computed later by surprise module
                        notes=row.get("notes", "").strip() or None,
                    )
                    events.append(event)
                except (KeyError, ValueError) as e:
                    logger.error(f"Error parsing consensus row: {row} — {e}")
                    continue
    except Exception as e:
        logger.error(f"Failed to read consensus CSV: {e}")

    logger.info(f"Loaded {len(events)} CPI/IIP events from {csv_path}")
    return events


def load_all_events() -> list[MacroEvent]:
    """
    Load MPC from CSV, CPI/IIP from consensus CSV, merge, sort by date descending.

    Uses a module-level cache to avoid redundant Finnhub API calls on every request.

    Returns:
        Sorted list of all MacroEvent objects, newest first.
    """
    global _events_cache
    if _events_cache is not None:
        return _events_cache

    mpc_events = _load_mpc_events()
    consensus_events = _load_consensus_events()

    all_events = mpc_events + consensus_events
    all_events.sort(key=lambda e: e.date, reverse=True)

    logger.info(f"Total events loaded: {len(all_events)} "
                f"(MPC: {len(mpc_events)}, CPI/IIP: {len(consensus_events)})")

    # Compute surprise scores on the fly (oldest first for correct std/consensus propagation)
    # Lazy import to avoid circular dependency (surprise.py imports MacroEvent from this module)
    from modules.surprise import compute_surprise_score
    finnhub_key = os.getenv("FINNHUB_API_KEY", "")
    consensus_csv_path = DATA_DIR / "consensus.csv"
    consensus_df = pd.read_csv(consensus_csv_path) if consensus_csv_path.exists() else pd.DataFrame()

    for event in reversed(all_events):
        event.surprise_score = compute_surprise_score(event, all_events, finnhub_key, consensus_df)

    # Log surprise score calculation statistics
    mpc_count = 0
    cpi_with_score = 0
    cpi_no_score_consensus = 0
    cpi_no_score_actual = 0
    iip_with_score = 0
    iip_no_score_actual = 0
    
    for event in all_events:
        if event.event_type == "MPC":
            mpc_count += 1
        elif event.event_type == "CPI":
            if event.surprise_score is not None:
                cpi_with_score += 1
            elif event.actual is None:
                cpi_no_score_actual += 1
            else:
                cpi_no_score_consensus += 1
        elif event.event_type == "IIP":
            if event.surprise_score is not None:
                iip_with_score += 1
            elif event.actual is None:
                iip_no_score_actual += 1

    logger.info(
        f"Surprise score computation summary:\n"
        f"  - MPC events (excluded from surprise): {mpc_count}\n"
        f"  - CPI events with surprise score: {cpi_with_score}\n"
        f"  - CPI events missing consensus: {cpi_no_score_consensus}\n"
        f"  - CPI events missing actual: {cpi_no_score_actual}\n"
        f"  - IIP events with surprise score: {iip_with_score}\n"
        f"  - IIP events missing actual: {iip_no_score_actual}"
    )

    _events_cache = all_events
    return all_events



def get_event_by_id(event_id: str) -> MacroEvent | None:
    """
    Return a single event by its ID, or None if not found.

    Args:
        event_id: The unique event identifier (e.g., "MPC-2024-06-07").

    Returns:
        The matching MacroEvent or None.
    """
    all_events = load_all_events()
    for event in all_events:
        if event.id == event_id:
            return event

    logger.warning(f"Event not found: {event_id}")
    return None


def filter_events(
    events: list[MacroEvent],
    event_type: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = 100,
) -> list[MacroEvent]:
    """
    Filter and paginate a list of MacroEvent objects.

    Args:
        events: The list of events to filter.
        event_type: Filter by event type ("MPC", "CPI", "IIP"). None or "all" = no filter.
        from_date: Only include events on or after this date.
        to_date: Only include events on or before this date.
        limit: Maximum number of events to return.

    Returns:
        Filtered and limited list of MacroEvent objects.
    """
    filtered = events

    # Filter by event type
    if event_type and event_type.lower() != "all":
        filtered = [e for e in filtered if e.event_type.upper() == event_type.upper()]

    # Filter by date range
    if from_date:
        filtered = [e for e in filtered if e.date >= from_date]
    if to_date:
        filtered = [e for e in filtered if e.date <= to_date]

    # Apply limit
    if limit > 0:
        filtered = filtered[:limit]

    return filtered
