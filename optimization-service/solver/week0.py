"""
Week 0 (pre-season deployment) optimizer.

Handles the multi-pass vehicle reuse logic specific to pre-season
equipment distribution from hubs to Week 1 game venues.

Week 0 has no time crunch — trucks make multiple round trips over
days/weeks. This module wraps the standard optimize_week() in a
multi-pass loop that releases vehicles between passes while keeping
consumed assets tracked to prevent double-shipping.
"""

from __future__ import annotations

import time

from solver.clustering import VenueCluster, cluster_venues
from solver.constraints import Constraints, Demand
from solver.data_loader import WeekData
from solver.distance_matrix import DistanceMatrix
from solver.optimizer import OptimizationResult, optimize_week

MAX_PASSES = 10  # Safety limit to prevent infinite loops


def optimize_week0(
    week_data: WeekData,
    dist_matrix: DistanceMatrix,
    constraints: Constraints,
    clusters: list[VenueCluster],
    timeout_ms: int = 30000,
) -> OptimizationResult:
    """
    Multi-pass optimizer for Week 0 pre-season deployment.

    Each pass:
    1. Run standard optimize_week() — assigns all available vehicles
    2. Collect generated trips
    3. Release vehicles and personnel (they can drive again the next day)
    4. Keep assets consumed (they've been delivered to venues)
    5. Remove fulfilled demands, re-cluster remaining venues
    6. Repeat until all demands met OR no progress OR max_passes hit

    Args:
        week_data: All data for the week (derived from Week 1 games)
        dist_matrix: Pre-built distance matrix
        constraints: Constraints with demands (no time windows for Week 0)
        clusters: Initial venue clusters
        timeout_ms: Solver timeout per pass in milliseconds

    Returns:
        OptimizationResult with all trips across all passes
    """
    start = time.time()
    total_budget_ms = timeout_ms * 3  # Total time budget across all passes

    combined = OptimizationResult()
    global_used_asset_ids: set[str] = set()
    all_demands = list(constraints.demands)

    # Track which (venue_id, customer_id) combos have been fully served
    served_set: set[tuple[str, str]] = set()
    pass_num = 0

    for pass_num in range(1, MAX_PASSES + 1):
        elapsed_ms = int((time.time() - start) * 1000)
        if elapsed_ms >= total_budget_ms:
            combined.warnings.append(
                f"Time budget exceeded after {pass_num - 1} passes"
            )
            break

        # Filter to only unmet demands
        remaining_demands = [
            d for d in all_demands
            if (d.venue_id, d.customer_id) not in served_set
        ]

        if not remaining_demands:
            break

        # Build pass-specific constraints (no time windows for Week 0)
        pass_constraints = Constraints(
            demands=remaining_demands,
            time_windows={},
            max_drive_hrs=constraints.max_drive_hrs,
            setup_buffer_hours=0,
            teardown_buffer_hours=0,
            blocked_asset_ids=constraints.blocked_asset_ids,
            hub_vehicle_counts=constraints.hub_vehicle_counts,
            hub_personnel_counts=constraints.hub_personnel_counts,
        )

        # Re-cluster only remaining venues
        remaining_venue_ids = {d.venue_id for d in remaining_demands}
        remaining_venues = [
            v for v in week_data.game_venues
            if v.id in remaining_venue_ids
        ]

        pass_clusters = cluster_venues(
            remaining_venues,
            week_data.hub_locations,
            dist_matrix,
        )

        if not pass_clusters:
            break

        # Reduce per-pass timeout for subsequent passes
        remaining_budget = total_budget_ms - elapsed_ms
        pass_timeout = min(timeout_ms, remaining_budget)

        # Run single pass — vehicles and personnel are fresh,
        # only assets are accumulated across passes
        prev_asset_count = len(global_used_asset_ids)
        result = optimize_week(
            week_data, dist_matrix, pass_constraints, pass_clusters,
            timeout_ms=pass_timeout,
            pre_used_asset_ids=global_used_asset_ids,
        )

        new_trip_count = len(result.trips)
        if new_trip_count == 0:
            # No trips generated this pass — we're stuck
            combined.unassigned_demands.extend(result.unassigned_demands)
            combined.warnings.append(
                f"Pass {pass_num}: No trips generated, "
                f"{len(remaining_demands)} demands remain"
            )
            break

        # Accumulate trips and warnings
        combined.trips.extend(result.trips)
        combined.warnings.extend(result.warnings)
        combined.warnings.append(
            f"Pass {pass_num}: {new_trip_count} trips generated"
        )

        # Track consumed assets (they've been delivered — can't ship again)
        for trip in result.trips:
            for asset in trip.assets:
                global_used_asset_ids.add(asset.asset_id)

        # If no new assets were consumed, we're stuck in a loop
        new_assets_consumed = len(global_used_asset_ids) - prev_asset_count
        if new_assets_consumed == 0:
            combined.warnings.append(
                f"Pass {pass_num}: No new assets consumed, stopping"
            )
            combined.unassigned_demands.extend(result.unassigned_demands)
            break

        # Mark fully served demands
        for trip in result.trips:
            for stop in trip.stops:
                if stop.demand:
                    served_set.add(
                        (stop.demand.venue_id, stop.demand.customer_id)
                    )

        # Check if all demands are met
        if not result.has_unassigned:
            break

        try:
            print(f"[week0] Pass {pass_num}: {new_trip_count} trips, "
                  f"{new_assets_consumed} assets consumed, "
                  f"{len(result.unassigned_demands)} still unassigned",
                  flush=True)
        except OSError:
            pass

    combined.solve_time_ms = int((time.time() - start) * 1000)
    combined.status = (
        "completed" if not combined.unassigned_demands else "partial"
    )

    try:
        print(f"[week0] Complete: {len(combined.trips)} total trips "
              f"across {pass_num} passes, {combined.solve_time_ms}ms",
              flush=True)
    except OSError:
        pass

    return combined
