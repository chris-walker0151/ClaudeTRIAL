"""
Infeasibility handler — 6-step constraint relaxation cascade.

When the optimizer cannot fulfill all demands, this module progressively
relaxes constraints to find the best possible partial solution.

Cascade steps:
1. Relax soft constraints (allow more miles, more vehicles)
2. Relax branding constraint (allow unbranded assets)
3. Split multi-stop trips into single-stop trips
4. Allow cross-hub assignments
5. Flag remaining as UNASSIGNED with explanations
6. Return partial solution + unassigned demands list
"""

from __future__ import annotations

from typing import Any

from solver.clustering import VenueCluster, cluster_venues
from solver.constraints import Constraints, build_constraints
from solver.data_loader import WeekData
from solver.distance_matrix import DistanceMatrix
from solver.optimizer import OptimizationResult, UnassignedDemand, optimize_week


def handle_infeasibility(
    week_data: WeekData,
    dist_matrix: DistanceMatrix,
    initial_result: OptimizationResult,
) -> OptimizationResult:
    """
    Apply the 6-step constraint relaxation cascade to resolve infeasibility.

    Each step relaxes one category of constraints and re-runs the optimizer.
    Stops at the first step that produces a feasible (or better) solution.

    Args:
        week_data: Full week data
        dist_matrix: Pre-built distance matrix
        initial_result: Result from the initial optimization run

    Returns:
        Improved OptimizationResult with constraint relaxation annotations
    """
    best_result = initial_result
    remaining_unassigned = list(initial_result.unassigned_demands)

    if not remaining_unassigned:
        return best_result

    # Step 1: Relax soft constraints
    result = _step1_relax_soft_constraints(week_data, dist_matrix)
    if result and _is_better(result, best_result):
        best_result = result
        best_result.constraint_relaxations.append({
            "step": 1,
            "action": "relaxed_soft_constraints",
            "detail": "Allowed more miles, more vehicles, relaxed hub preference",
        })
        if not result.has_unassigned:
            return best_result

    # Step 2: Relax branding constraints
    result = _step2_relax_branding(week_data, dist_matrix)
    if result and _is_better(result, best_result):
        best_result = result
        best_result.constraint_relaxations.append({
            "step": 2,
            "action": "relaxed_branding",
            "detail": "Allowed unbranded or mismatched branding assets",
        })
        best_result.warnings.append(
            "Some assets may need rebranding before deployment"
        )
        if not result.has_unassigned:
            return best_result

    # Step 3: Split multi-stop trips into single-stop
    result = _step3_split_multi_stop(week_data, dist_matrix)
    if result and _is_better(result, best_result):
        best_result = result
        best_result.constraint_relaxations.append({
            "step": 3,
            "action": "split_multi_stop",
            "detail": "Split multi-stop trips into individual routes",
        })
        if not result.has_unassigned:
            return best_result

    # Step 4: Allow cross-hub assignments
    result = _step4_cross_hub(week_data, dist_matrix)
    if result and _is_better(result, best_result):
        best_result = result
        best_result.constraint_relaxations.append({
            "step": 4,
            "action": "cross_hub_assignments",
            "detail": "Allowed vehicles from distant hubs to cover nearby games",
        })
        if not result.has_unassigned:
            return best_result

    # Step 5: Flag remaining as UNASSIGNED with explanations
    best_result = _step5_classify_unassigned(best_result, week_data)

    # Step 6: Set status to partial
    if best_result.has_unassigned:
        best_result.status = "partial"
        best_result.constraint_relaxations.append({
            "step": 6,
            "action": "partial_solution",
            "detail": f"{len(best_result.unassigned_demands)} demands could not be fulfilled",
        })

    return best_result


def _is_better(new: OptimizationResult, old: OptimizationResult) -> bool:
    """Check if new result is better (fewer unassigned demands)."""
    return len(new.unassigned_demands) < len(old.unassigned_demands)


def _step1_relax_soft_constraints(
    week_data: WeekData, dist_matrix: DistanceMatrix,
) -> OptimizationResult | None:
    """Relax soft constraints and re-run optimizer."""
    try:
        constraints = build_constraints(week_data)
        # Reduce all soft constraint weights
        constraints.weight_minimize_miles = 0.1
        constraints.weight_minimize_vehicles = 0.1
        constraints.weight_prefer_closest_hub = 0.1
        constraints.weight_minimize_rebranding = 0.1
        constraints.weight_geographic_clustering = 0.1

        clusters = cluster_venues(
            week_data.game_venues,
            week_data.hub_locations,
            dist_matrix,
        )
        return optimize_week(week_data, dist_matrix, constraints, clusters)
    except Exception:
        return None


def _step2_relax_branding(
    week_data: WeekData, dist_matrix: DistanceMatrix,
) -> OptimizationResult | None:
    """Relax branding constraints — allow unbranded/mismatched assets."""
    try:
        constraints = build_constraints(week_data)
        # Clear blocked asset IDs (allow assets with pending branding)
        constraints.blocked_asset_ids = set()
        constraints.weight_minimize_rebranding = 0.0

        clusters = cluster_venues(
            week_data.game_venues,
            week_data.hub_locations,
            dist_matrix,
        )
        return optimize_week(week_data, dist_matrix, constraints, clusters)
    except Exception:
        return None


def _step3_split_multi_stop(
    week_data: WeekData, dist_matrix: DistanceMatrix,
) -> OptimizationResult | None:
    """Split all multi-stop clusters into single-stop trips."""
    try:
        constraints = build_constraints(week_data)
        constraints.blocked_asset_ids = set()

        # Create single-stop clusters (1 venue per cluster)
        clusters = [
            VenueCluster(venues=[venue])
            for venue in week_data.game_venues
        ]
        return optimize_week(week_data, dist_matrix, constraints, clusters)
    except Exception:
        return None


def _step4_cross_hub(
    week_data: WeekData, dist_matrix: DistanceMatrix,
) -> OptimizationResult | None:
    """Allow cross-hub assignments — any vehicle can serve any venue."""
    try:
        constraints = build_constraints(week_data)
        constraints.blocked_asset_ids = set()
        constraints.weight_prefer_closest_hub = 0.0

        # Single-stop clusters for maximum flexibility
        clusters = [
            VenueCluster(venues=[venue])
            for venue in week_data.game_venues
        ]
        return optimize_week(week_data, dist_matrix, constraints, clusters)
    except Exception:
        return None


def _step5_classify_unassigned(
    result: OptimizationResult, week_data: WeekData,
) -> OptimizationResult:
    """
    Classify remaining unassigned demands with specific explanations.
    """
    classified: list[UnassignedDemand] = []

    for demand in result.unassigned_demands:
        reason = demand.reason

        # Check for specific failure reasons
        if "available" in reason.lower():
            # Already has a specific reason
            classified.append(demand)
            continue

        # Try to determine why
        matching_assets = [
            a for a in week_data.assets
            if a.asset_type == demand.asset_type
            and a.condition not in ("out_of_service", "needs_repair")
        ]

        if not matching_assets:
            demand.reason = f"Asset type/model not available in inventory"
        elif all(a.status != "at_hub" for a in matching_assets):
            demand.reason = f"All {demand.asset_type} assets are deployed — none at hub"
        else:
            # Assets exist but couldn't be assigned (vehicle/personnel issue)
            total_vehicles = len(week_data.vehicles)
            total_personnel = len([
                p for p in week_data.personnel if p.role in ("driver", "lead_tech")
            ])
            if total_vehicles == 0:
                demand.reason = "No vehicle with sufficient capacity available"
            elif total_personnel == 0:
                demand.reason = "No personnel available at nearest hub"
            else:
                demand.reason = "Insufficient resources to cover all demands this week"

        classified.append(demand)

    result.unassigned_demands = classified
    return result
