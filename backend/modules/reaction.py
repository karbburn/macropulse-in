"""
Reaction Attribution Module

Builds reaction points and computes linear regressions for market surprise vs reaction.
"""

import logging
from dataclasses import dataclass, asdict
from datetime import date
import pandas as pd
from scipy.stats import linregress

from modules.event_calendar import MacroEvent
from modules.market_snapshot import get_snapshot_with_cache

logger = logging.getLogger(__name__)

@dataclass
class ReactionPoint:
    event_id: str
    event_date: date
    asset: str
    surprise_score: float
    reaction_pct: float        # T+2hr % change from T-60 (or custom window)
    actual: float
    consensus: float

    def to_dict(self) -> dict:
        """Convert to JSON-serializable dictionary."""
        result = asdict(self)
        result["event_date"] = self.event_date.isoformat()
        return result

def build_reaction_points(
    events: list[MacroEvent],
    asset: str,
    window: str  # "T+30" | "T+2H" | "T+1D"
) -> list[ReactionPoint]:
    """
    For each event with a surprise_score and a snapshot for the given asset+window:
    Create ReactionPoint(event_id, event_date, asset, surprise_score, reaction_pct, actual, consensus)
    """
    points = []
    for event in events:
        if event.surprise_score is None:
            continue
            
        snap = get_snapshot_with_cache(event, asset)
        if snap is None:
            continue
            
        window_data = snap.get(window)
        if window_data is None:
            continue
            
        reaction_pct = window_data.get("pct_change_from_T60")
        if reaction_pct is None:
            continue
            
        # Ensure actual/consensus are floats, if not None
        act = float(event.actual) if event.actual is not None else None
        con = float(event.consensus) if event.consensus is not None else None
        
        points.append(ReactionPoint(
            event_id=event.id,
            event_date=event.date,
            asset=asset,
            surprise_score=event.surprise_score,
            reaction_pct=reaction_pct,
            actual=act,
            consensus=con
        ))
    return points

def compute_regression(points: list[ReactionPoint]) -> dict:
    """
    Use scipy.stats.linregress to compute regression parameters.
    Returnzeros dict if fewer than 5 points. Never crash.
    """
    if len(points) < 5:
        return {
            "slope": 0.0,
            "intercept": 0.0,
            "r_squared": 0.0
        }
    try:
        x = [p.surprise_score for p in points]
        y = [p.reaction_pct for p in points]
        res = linregress(x, y)
        
        # rvalue ** 2 is r_squared
        r_squared = float(res.rvalue ** 2) if pd.notna(res.rvalue) else 0.0
        slope = float(res.slope) if pd.notna(res.slope) else 0.0
        intercept = float(res.intercept) if pd.notna(res.intercept) else 0.0
        
        return {
            "slope": round(slope, 4),
            "intercept": round(intercept, 4),
            "r_squared": round(r_squared, 4)
        }
    except Exception as e:
        logger.error(f"Error computing regression: {e}")
        return {
            "slope": 0.0,
            "intercept": 0.0,
            "r_squared": 0.0
        }
