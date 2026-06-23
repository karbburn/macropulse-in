"""
Nightly Precompute Script — GitHub Actions entry point.

Runs every night at 07:00 IST (01:30 UTC) via GitHub Actions.
Can also be triggered manually via workflow_dispatch.

Steps:
1. Load all events from mpc_calendar.csv and consensus.csv
2. Fetch latest CPI from Finnhub → upsert new events to Supabase
3. Fetch latest IIP from data.gov.in → upsert new events to Supabase
4. Compute surprise scores for all events → update Supabase
5. For each event without a cached snapshot (or snapshot > 25hr old):
   compute all 4 asset snapshots → upsert to Supabase
6. Recompute all reaction_points → upsert to Supabase
7. Print summary: N events processed, M snapshots updated, K errors

Error handling: catch all exceptions per event, log, continue.
Never let one failed event abort the entire job.
"""

import logging
import os
import sys
import time as time_module
from datetime import datetime, date as date_type, timezone, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap: add backend/ to Python path so module imports work
# regardless of where the script is invoked from (local or CI).
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

# ---------------------------------------------------------------------------
# Logging setup (structured, timestamped — works well in GitHub Actions logs)
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("precompute_nightly")

# ---------------------------------------------------------------------------
# Lazy imports (after path bootstrapping)
# ---------------------------------------------------------------------------
from modules.event_calendar import (
    MacroEvent,
    load_all_events,
)
import modules.event_calendar as ec
from modules.market_snapshot import (
    TICKERS,
    get_snapshot_with_cache,
    _compute_snapshot,
)
from modules.reaction import build_reaction_points
from modules.cache import (
    _get_supabase_client,
    get_cached_snapshot,
    cache_snapshot,
    set_reaction_points,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _snapshot_is_stale(event_id: str, asset: str) -> bool:
    """
    Check if a cached snapshot is older than 25 hours.
    Returns True if stale or not found.
    """
    client = _get_supabase_client()
    if client is None:
        return True  # No Supabase → always compute fresh

    try:
        response = (
            client.table("snapshots")
            .select("computed_at")
            .eq("event_id", event_id)
            .eq("asset", asset)
            .execute()
        )
        if not response.data or len(response.data) == 0:
            return True

        computed_at_str = response.data[0].get("computed_at")
        if not computed_at_str:
            return True

        computed_at = datetime.fromisoformat(computed_at_str.replace("Z", "+00:00"))
        age = datetime.now(timezone.utc) - computed_at
        return age > timedelta(hours=25)

    except Exception as e:
        logger.warning(f"Error checking snapshot staleness for {event_id}/{asset}: {e}")
        return True


def _get_all_snapshot_timestamps() -> dict[tuple[str, str], datetime]:
    """
    Query all snapshot timestamps once, return {(event_id, asset): computed_at}.
    Replaces N+1 per-pair staleness queries with a single batch query.
    """
    client = _get_supabase_client()
    if client is None:
        return {}

    try:
        response = (
            client.table("snapshots")
            .select("event_id, asset, computed_at")
            .execute()
        )
        timestamps = {}
        for row in (response.data or []):
            key = (row["event_id"], row["asset"])
            computed_at_str = row.get("computed_at", "")
            if computed_at_str:
                timestamps[key] = datetime.fromisoformat(
                    computed_at_str.replace("Z", "+00:00")
                )
        return timestamps
    except Exception as e:
        logger.warning(f"Error fetching snapshot timestamps: {e}")
        return {}


def _upsert_events_to_supabase(events: list[MacroEvent]) -> int:
    """
    Upsert all events into the Supabase events table.
    Returns the number of events successfully upserted.
    """
    client = _get_supabase_client()
    if client is None:
        logger.warning("Supabase not available — skipping event upsert.")
        return 0

    upserted = 0
    batch = []
    for event in events:
        row = {
            "id": event.id,
            "event_type": event.event_type,
            "date": event.date.isoformat(),
            "time": event.time.isoformat() if event.time else None,
            "outcome": event.outcome,
            "actual": event.actual,
            "consensus": event.consensus,
            "surprise_score": event.surprise_score,
            "notes": event.notes,
        }
        batch.append(row)

    # Upsert in chunks of 50 to avoid oversized payloads
    chunk_size = 50
    for i in range(0, len(batch), chunk_size):
        chunk = batch[i:i + chunk_size]
        try:
            client.table("events").upsert(chunk).execute()
            upserted += len(chunk)
        except Exception as e:
            logger.error(f"Error upserting event batch [{i}:{i+len(chunk)}]: {e}")

    return upserted


def _fetch_new_cpi_from_finnhub() -> list[dict]:
    """
    Fetch recent CPI events from Finnhub economic calendar.
    Returns a list of dicts with event data for any new India CPI releases.
    """
    api_key = os.getenv("FINNHUB_API_KEY", "").strip()
    if not api_key:
        logger.info("FINNHUB_API_KEY not set — skipping CPI fetch from Finnhub.")
        return []

    try:
        import requests
        # Look back 90 days and forward 30 days
        now = datetime.now(timezone.utc)
        from_date = (now - timedelta(days=90)).strftime("%Y-%m-%d")
        to_date = (now + timedelta(days=30)).strftime("%Y-%m-%d")

        url = "https://finnhub.io/api/v1/calendar/economic"
        params = {
            "from": from_date,
            "to": to_date,
            "token": api_key,
        }
        response = requests.get(url, params=params, timeout=30)
        if response.status_code != 200:
            logger.warning(f"Finnhub API returned HTTP {response.status_code}")
            return []

        data = response.json()
        calendar = data.get("economicCalendar", [])
        new_events = []

        for item in calendar:
            country = str(item.get("country", "")).upper()
            event_name = str(item.get("event", "")).lower()

            if country not in ("IN", "INDIA"):
                continue
            if "cpi" not in event_name:
                continue

            event_date_str = item.get("date", "")
            actual = item.get("actual")
            estimate = item.get("estimate") or item.get("forecast")

            if event_date_str:
                new_events.append({
                    "date": event_date_str,
                    "event_type": "CPI",
                    "actual": float(actual) if actual is not None else None,
                    "consensus": float(estimate) if estimate is not None else None,
                    "source": "Finnhub",
                })

        logger.info(f"Finnhub returned {len(new_events)} India CPI events.")
        return new_events

    except Exception as e:
        logger.error(f"Error fetching CPI from Finnhub: {e}")
        return []


def _fetch_new_iip_from_datagov() -> list[dict]:
    """
    Fetch recent IIP data from data.gov.in API.
    Returns a list of dicts with event data for any new IIP releases.
    """
    api_key = os.getenv("DATAGOV_API_KEY", "").strip()
    if not api_key:
        logger.info("DATAGOV_API_KEY not set — skipping IIP fetch from data.gov.in.")
        return []

    try:
        import requests
        url = "https://api.data.gov.in/resource/a0116e98-ad57-4e22-994e-e32e2e37b66e"
        params = {
            "api-key": api_key,
            "format": "json",
            "limit": 20,
            "offset": 0,
        }
        response = requests.get(url, params=params, timeout=30)
        if response.status_code != 200:
            logger.warning(f"data.gov.in API returned HTTP {response.status_code}")
            return []

        data = response.json()
        records = data.get("records", [])
        new_events = []

        for record in records:
            # data.gov.in IIP records have different field names depending on dataset
            date_str = record.get("date") or record.get("month_year")
            actual = record.get("index_value") or record.get("iip_index")

            if date_str and actual:
                try:
                    new_events.append({
                        "date": date_str,
                        "event_type": "IIP",
                        "actual": float(actual),
                        "consensus": None,
                        "source": "data.gov.in",
                    })
                except (ValueError, TypeError):
                    continue

        logger.info(f"data.gov.in returned {len(new_events)} IIP records.")
        return new_events

    except Exception as e:
        logger.error(f"Error fetching IIP from data.gov.in: {e}")
        return []


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main() -> None:
    """Execute the full nightly precompute pipeline."""
    start_time = time_module.time()
    logger.info("=" * 60)
    logger.info("NIGHTLY PRECOMPUTE — Starting pipeline")
    logger.info("=" * 60)

    # Counters for the final summary
    events_processed = 0
    events_upserted = 0
    snapshots_computed = 0
    snapshots_skipped = 0
    reaction_points_count = 0
    errors = 0

    # ------------------------------------------------------------------
    # Step 1: Load all events from CSV files
    # ------------------------------------------------------------------
    logger.info("Step 1: Loading events from CSV files...")
    try:
        # Force fresh load by clearing module-level cache
        ec._events_cache = None

        all_events = load_all_events()
        events_processed = len(all_events)
        logger.info(f"Loaded {events_processed} events from CSVs.")
    except Exception as e:
        logger.error(f"FATAL: Failed to load events: {e}")
        sys.exit(1)

    # ------------------------------------------------------------------
    # Step 2: Fetch latest CPI from Finnhub
    # ------------------------------------------------------------------
    logger.info("Step 2: Fetching latest CPI data from Finnhub...")
    new_cpi = _fetch_new_cpi_from_finnhub()
    if new_cpi:
        logger.info(f"Found {len(new_cpi)} CPI events from Finnhub.")
        for cpi in new_cpi:
            event_id = f"CPI-{cpi['date']}"
            existing = next((e for e in all_events if e.id == event_id), None)
            if existing is None:
                new_event = MacroEvent(
                    id=event_id,
                    event_type="CPI",
                    date=date_type.fromisoformat(cpi["date"]),
                    time=None,
                    outcome=str(cpi["actual"]) if cpi.get("actual") else None,
                    actual=cpi.get("actual"),
                    consensus=cpi.get("consensus"),
                    surprise_score=None,
                    notes=f"Source: {cpi.get('source', 'Finnhub')}",
                )
                all_events.append(new_event)
            elif existing.actual is None and cpi.get("actual") is not None:
                existing.actual = cpi["actual"]
                existing.outcome = str(cpi["actual"])
                if cpi.get("consensus") is not None:
                    existing.consensus = cpi["consensus"]
    else:
        logger.info("No new CPI events from Finnhub.")

    # ------------------------------------------------------------------
    # Step 3: Fetch latest IIP from data.gov.in
    # ------------------------------------------------------------------
    logger.info("Step 3: Fetching latest IIP data from data.gov.in...")
    new_iip = _fetch_new_iip_from_datagov()
    if new_iip:
        logger.info(f"Found {len(new_iip)} IIP records from data.gov.in.")
        for iip in new_iip:
            event_id = f"IIP-{iip['date']}"
            existing = next((e for e in all_events if e.id == event_id), None)
            if existing is None:
                new_event = MacroEvent(
                    id=event_id,
                    event_type="IIP",
                    date=date_type.fromisoformat(iip["date"]),
                    time=None,
                    outcome=str(iip["actual"]) if iip.get("actual") else None,
                    actual=iip.get("actual"),
                    consensus=iip.get("consensus"),
                    surprise_score=None,
                    notes=f"Source: {iip.get('source', 'data.gov.in')}",
                )
                all_events.append(new_event)
            elif existing.actual is None and iip.get("actual") is not None:
                existing.actual = iip["actual"]
                existing.outcome = str(iip["actual"])
    else:
        logger.info("No new IIP events from data.gov.in.")

    # ------------------------------------------------------------------
    # Step 4: Upsert all events to Supabase (with surprise scores)
    # ------------------------------------------------------------------
    logger.info("Step 4: Upserting events to Supabase...")
    events_upserted = _upsert_events_to_supabase(all_events)
    logger.info(f"Upserted {events_upserted} events to Supabase.")

    # ------------------------------------------------------------------
    # Step 5: Compute snapshots for events missing or stale
    # ------------------------------------------------------------------
    logger.info("Step 5: Computing market snapshots...")
    assets = list(TICKERS.keys())  # NIFTY, USDINR, VIX, GSEC

    # Batch-fetch all existing snapshot timestamps (1 query instead of N)
    snapshot_timestamps = _get_all_snapshot_timestamps()
    logger.info(f"Fetched timestamps for {len(snapshot_timestamps)} existing snapshots.")

    for event in all_events:
        for asset in assets:
            try:
                # Check staleness locally using the batch-fetched timestamps
                computed_at = snapshot_timestamps.get((event.id, asset))
                if computed_at is not None:
                    age = datetime.now(timezone.utc) - computed_at
                    if age <= timedelta(hours=25):
                        snapshots_skipped += 1
                        continue

                # Directly compute fresh snapshot (bypass cache — we know it's stale/missing)
                snapshot_data = _compute_snapshot(event, asset)
                if snapshot_data is not None:
                    cache_snapshot(event.id, asset, snapshot_data)
                    snapshots_computed += 1
                else:
                    logger.warning(f"No data available for {event.id}/{asset}")

            except Exception as e:
                logger.error(f"Error computing snapshot for {event.id}/{asset}: {e}")
                errors += 1
                continue

    logger.info(
        f"Snapshots: {snapshots_computed} computed, "
        f"{snapshots_skipped} fresh (skipped), "
        f"{errors} errors."
    )

    # ------------------------------------------------------------------
    # Step 6: Recompute reaction points
    # ------------------------------------------------------------------
    logger.info("Step 6: Recomputing reaction points...")

    # Filter to events with surprise scores only (CPI + IIP)
    surprise_events = [e for e in all_events if e.surprise_score is not None]

    # NOTE: The Supabase reaction_points table PK is (event_id, asset, window).
    # Only upsert the default window (T+2H) here to match the existing schema.
    # Additional windows can be computed on-demand by the API layer.
    for asset in assets:
        try:
            points = build_reaction_points(surprise_events, asset, "T+2H")
            if points:
                point_dicts = []
                for p in points:
                    point_dicts.append({
                        "event_id": p.event_id,
                        "asset": p.asset,
                        "window": "T+2H",
                        "surprise_score": p.surprise_score,
                        "reaction_pct": p.reaction_pct,
                    })
                set_reaction_points(point_dicts)
                reaction_points_count += len(points)
        except Exception as e:
            logger.error(f"Error computing reaction points for {asset}/T+2H: {e}")
            errors += 1

    logger.info(f"Reaction points: {reaction_points_count} computed.")

    # ------------------------------------------------------------------
    # Step 7: Summary
    # ------------------------------------------------------------------
    elapsed = time_module.time() - start_time
    elapsed_min = elapsed / 60.0

    logger.info("=" * 60)
    logger.info("NIGHTLY PRECOMPUTE — Summary")
    logger.info("=" * 60)
    logger.info(f"  Events processed:       {events_processed}")
    logger.info(f"  Events upserted to DB:  {events_upserted}")
    logger.info(f"  Snapshots computed:      {snapshots_computed}")
    logger.info(f"  Snapshots skipped:       {snapshots_skipped}")
    logger.info(f"  Reaction points:         {reaction_points_count}")
    logger.info(f"  Errors:                  {errors}")
    logger.info(f"  Elapsed time:            {elapsed_min:.1f} minutes")
    logger.info("=" * 60)

    if errors > 0:
        logger.warning(f"Completed with {errors} errors — check logs above.")
        if events_processed > 0 and errors > events_processed * 0.5:
            logger.error(f"Error rate {errors}/{events_processed} exceeds 50% — exiting non-zero.")
            sys.exit(2)
    else:
        logger.info("Completed successfully — no errors.")


if __name__ == "__main__":
    main()
