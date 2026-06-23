"""
Supabase Cache Helpers

Provides read/write access to cached snapshots and reaction points
in Supabase. If Supabase is unreachable or env vars are missing,
all functions degrade gracefully — return None / empty list and
log warnings. The server never crashes due to cache failures.

Cache invalidation: snapshots older than 25 hours are recomputed
by the nightly job. Never delete historical event records — only
update snapshots.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
#  Supabase client initialisation (lazy, fail-safe)
# --------------------------------------------------------------------------- #

_supabase_client = None
_init_attempted = False


def _get_supabase_client() -> Any:
    """
    Lazily initialise and return the Supabase client.

    Returns None if env vars are missing or the connection fails.
    Logs the reason exactly once so the log doesn't flood.
    """
    global _supabase_client, _init_attempted

    if _init_attempted:
        return _supabase_client          # already tried — return whatever we got

    _init_attempted = True

    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()

    if not url or not key:
        logger.warning(
            "SUPABASE_URL and/or SUPABASE_KEY not set — "
            "caching disabled; all data will be computed on the fly."
        )
        return None

    try:
        from supabase import create_client  # type: ignore
        _supabase_client = create_client(url, key)
        logger.info("Supabase client initialised successfully.")
    except Exception as e:
        logger.error(f"Failed to initialise Supabase client: {e}")
        _supabase_client = None

    return _supabase_client


# --------------------------------------------------------------------------- #
#  Snapshot helpers
# --------------------------------------------------------------------------- #

def get_cached_snapshot(event_id: str, asset: str) -> dict | None:
    """
    Check Supabase ``snapshots`` table for a cached snapshot.

    Returns the ``windows`` JSON dict if found, None otherwise.
    Degrades gracefully on any error.
    """
    client = _get_supabase_client()
    if client is None:
        return None

    try:
        response = (
            client.table("snapshots")
            .select("windows, computed_at")
            .eq("event_id", event_id)
            .eq("asset", asset)
            .execute()
        )
        if response.data and len(response.data) > 0:
            row = response.data[0]
            logger.debug(f"Cache HIT: {event_id}/{asset}")
            return row["windows"]
        logger.debug(f"Cache MISS: {event_id}/{asset}")
        return None
    except Exception as e:
        logger.error(f"Error reading snapshot cache ({event_id}/{asset}): {e}")
        return None


def cache_snapshot(event_id: str, asset: str, data: dict) -> None:
    """
    Upsert a computed snapshot into the Supabase ``snapshots`` table.

    Silently returns on any error — caching is best-effort.
    """
    client = _get_supabase_client()
    if client is None:
        return

    try:
        row = {
            "event_id": event_id,
            "asset": asset,
            "windows": json.dumps(data) if isinstance(data, dict) else data,
            "computed_at": datetime.now(timezone.utc).isoformat(),
        }
        client.table("snapshots").upsert(row).execute()
        logger.debug(f"Cached snapshot: {event_id}/{asset}")
    except Exception as e:
        logger.error(f"Error writing snapshot cache ({event_id}/{asset}): {e}")


# --------------------------------------------------------------------------- #
#  Reaction-point helpers
# --------------------------------------------------------------------------- #

def get_reaction_points(asset: str, event_type: str) -> list[dict]:
    """
    Return all pre-computed reaction points for a given asset and event type.

    Returns an empty list if Supabase is unavailable or no rows exist.
    """
    client = _get_supabase_client()
    if client is None:
        return []

    try:
        query = (
            client.table("reaction_points")
            .select("*")
            .eq("asset", asset)
        )
        if event_type and event_type.lower() != "all":
            query = query.eq("event_type", event_type.upper())

        response = query.execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error reading reaction points ({asset}/{event_type}): {e}")
        return []


def set_reaction_points(points: list[dict]) -> None:
    """
    Bulk upsert reaction points into the Supabase ``reaction_points`` table.

    Each dict in *points* must contain at least ``event_id`` and ``asset``
    (the composite primary key).  Silently returns on error.
    """
    client = _get_supabase_client()
    if client is None:
        return

    if not points:
        return

    try:
        client.table("reaction_points").upsert(points).execute()
        logger.debug(f"Cached {len(points)} reaction points.")
    except Exception as e:
        logger.error(f"Error writing reaction points: {e}")


# --------------------------------------------------------------------------- #
#  Event-study helpers
# --------------------------------------------------------------------------- #

def get_cached_study(asset: str, decision_type: str) -> dict | None:
    """
    Retrieve cached event study path from Supabase snapshots table.
    """
    return get_cached_snapshot(f"study_{decision_type}", asset)


def cache_study(asset: str, decision_type: str, data: dict) -> None:
    """
    Cache event study path in Supabase snapshots table.
    """
    cache_snapshot(f"study_{decision_type}", asset, data)

