"""
Result writer module — writes optimization results to Supabase.

Writes to:
- optimizer_runs: Audit record of the optimization run
- trips: Individual trip records
- trip_stops: Ordered stops within each trip
- trip_assets: Assets assigned to each trip
- trip_personnel: Personnel assigned to each trip

Uses service role key to bypass RLS for server-to-server writes.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import httpx

import config
from solver.optimizer import OptimizationResult, Trip


def _supabase_headers() -> dict[str, str]:
    """Build headers for Supabase REST API requests."""
    return {
        "apikey": config.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _supabase_url(table: str) -> str:
    """Build Supabase REST API URL for a table."""
    return f"{config.SUPABASE_URL}/rest/v1/{table}"


def _post(table: str, data: list[dict] | dict) -> list[dict]:
    """Insert rows into a Supabase table."""
    response = httpx.post(
        _supabase_url(table),
        headers=_supabase_headers(),
        json=data,
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()


def _patch(table: str, row_id: str, data: dict) -> dict:
    """Update a row in a Supabase table."""
    response = httpx.patch(
        _supabase_url(table),
        headers={
            **_supabase_headers(),
            "Prefer": "return=representation",
        },
        params={"id": f"eq.{row_id}"},
        json=data,
        timeout=30.0,
    )
    response.raise_for_status()
    result = response.json()
    return result[0] if result else {}


def write_results(
    result: OptimizationResult,
    season_year: int,
    week_number: int,
    triggered_by: str = "manual",
) -> str:
    """
    Write optimization results to Supabase.

    Transaction flow:
    1. Insert optimizer_runs row (status=running)
    2. For each trip: insert trips → trip_stops → trip_assets → trip_personnel
    3. Update optimizer_runs (status=completed/partial/failed)

    Args:
        result: The optimization result to write
        season_year: Season year
        week_number: Week number
        triggered_by: Who triggered the run (user_id, cron, manual)

    Returns:
        The optimizer_run_id (UUID string)
    """
    if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_KEY:
        # No Supabase configured — return a fake ID for testing
        return str(uuid4())

    start_time = time.time()
    run_id = str(uuid4())

    try:
        # Step 1: Create optimizer_runs record
        run_data = {
            "id": run_id,
            "week_number": week_number,
            "season_year": season_year,
            "triggered_by": triggered_by,
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        _post("optimizer_runs", run_data)

        # Step 2: Write trips, stops, assets, personnel
        trips_written = 0
        trip_errors: list[str] = []

        for trip in result.trips:
            try:
                _write_trip(trip, run_id, season_year, week_number)
                trips_written += 1
            except Exception as e:
                trip_errors.append(
                    f"Failed to write trip to {trip.stops[0].venue_name if trip.stops else 'unknown'}: {str(e)}"
                )

        # Step 3: Update optimizer_runs with results
        duration_ms = int((time.time() - start_time) * 1000)

        unassigned_data = [
            {
                "customer": d.customer_name,
                "venue": d.venue_name,
                "asset_type": d.asset_type,
                "quantity": d.quantity,
                "reason": d.reason,
            }
            for d in result.unassigned_demands
        ]

        update_data: dict[str, Any] = {
            "status": result.status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "duration_ms": duration_ms,
            "trips_generated": trips_written,
            "warnings": result.warnings if result.warnings else None,
            "errors": (result.errors + trip_errors) if (result.errors or trip_errors) else None,
            "unassigned_demands": unassigned_data if unassigned_data else None,
            "constraint_relaxations": result.constraint_relaxations if result.constraint_relaxations else None,
        }
        _patch("optimizer_runs", run_id, update_data)

        return run_id

    except Exception as e:
        # Try to mark the run as failed
        try:
            duration_ms = int((time.time() - start_time) * 1000)
            _patch("optimizer_runs", run_id, {
                "status": "failed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "duration_ms": duration_ms,
                "errors": [str(e)],
            })
        except Exception:
            pass
        raise


def _write_trip(
    trip: Trip,
    run_id: str,
    season_year: int,
    week_number: int,
) -> str:
    """Write a single trip and its related records."""
    trip_id = str(uuid4())

    # Insert trip record
    trip_data = {
        "id": trip_id,
        "week_number": week_number,
        "season_year": season_year,
        "optimizer_run_id": run_id,
        "status": "recommended",
        "vehicle_id": trip.vehicle_id,
        "origin_type": "hub",
        "origin_id": trip.origin_hub_id,
        "depart_time": trip.depart_time,
        "return_time": trip.return_time,
        "total_miles": trip.total_miles,
        "total_drive_hrs": trip.total_drive_hrs,
        "is_recommended": True,
        "is_manual": False,
        "optimizer_score": trip.optimizer_score,
    }
    _post("trips", trip_data)

    # Insert trip stops
    stop_ids: dict[int, str] = {}
    for stop in trip.stops:
        stop_id = str(uuid4())
        stop_ids[stop.stop_order] = stop_id

        stop_data = {
            "id": stop_id,
            "trip_id": trip_id,
            "venue_id": stop.venue_id,
            "stop_order": stop.stop_order,
            "arrival_time": stop.arrival_time,
            "depart_time": stop.depart_time,
            "action": stop.action,
            "requires_hub_return": stop.requires_hub_return,
            "hub_return_reason": stop.hub_return_reason,
        }
        _post("trip_stops", stop_data)

    # Insert trip assets
    if trip.assets:
        asset_rows = [
            {
                "trip_id": trip_id,
                "asset_id": ta.asset_id,
                "stop_id": ta.stop_id,
            }
            for ta in trip.assets
        ]
        # Batch insert (up to 100 at a time)
        for i in range(0, len(asset_rows), 100):
            batch = asset_rows[i : i + 100]
            _post("trip_assets", batch)

    # Insert trip personnel
    if trip.personnel:
        personnel_rows = [
            {
                "trip_id": trip_id,
                "person_id": tp.person_id,
                "role_on_trip": tp.role_on_trip,
            }
            for tp in trip.personnel
        ]
        _post("trip_personnel", personnel_rows)

    return trip_id
