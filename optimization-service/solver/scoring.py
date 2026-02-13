"""
Trip scoring module — assigns quality scores (0-100) to optimization results.

Scoring factors (weighted):
- Distance efficiency: actual vs optimal straight-line (40%)
- Capacity utilization: weight used / vehicle capacity (20%)
- Time efficiency: drive time vs available window (15%)
- Constraint satisfaction: penalties for relaxed constraints (15%)
- Multi-stop bonus: points for grouped deliveries (10%)
"""

from __future__ import annotations

import math

from solver.data_loader import LatLng
from solver.distance_matrix import DistanceMatrix
from solver.optimizer import OptimizationResult, Trip


# Weight factors for scoring components
WEIGHT_DISTANCE = 0.40
WEIGHT_CAPACITY = 0.20
WEIGHT_TIME = 0.15
WEIGHT_CONSTRAINTS = 0.15
WEIGHT_MULTI_STOP = 0.10


def _haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate straight-line distance in miles."""
    R = 3959
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    h = (
        math.sin(dlat / 2) ** 2
        + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(h))


def _score_distance_efficiency(trip: Trip, dist_matrix: DistanceMatrix) -> float:
    """
    Score distance efficiency: how close is actual distance to optimal?
    100 = perfect (actual = theoretical minimum), 0 = 5x+ the minimum.
    """
    if trip.total_miles <= 0:
        return 100.0

    # Estimate minimum distance: straight-line hub → furthest venue → hub
    hub_loc = None
    for loc in dist_matrix.locations:
        if loc.label == trip.origin_hub_name:
            hub_loc = loc
            break

    if not hub_loc:
        return 50.0  # Unknown hub, neutral score

    # Find the furthest venue stop from hub
    max_straight_line = 0.0
    for stop in trip.stops:
        for loc in dist_matrix.locations:
            if loc.label == stop.venue_name:
                d = _haversine_miles(hub_loc.lat, hub_loc.lng, loc.lat, loc.lng)
                max_straight_line = max(max_straight_line, d)
                break

    if max_straight_line <= 0:
        return 50.0

    # Minimum round trip = 2 * straight-line distance to furthest venue
    min_distance = 2 * max_straight_line

    # Ratio: min / actual (1.0 = perfect, lower = worse)
    ratio = min_distance / trip.total_miles if trip.total_miles > 0 else 0
    # Road factor: expect ~1.3x straight line, so ratio of 0.77 is perfect
    adjusted_ratio = min(ratio / 0.77, 1.0)

    return max(0, min(100, adjusted_ratio * 100))


def _score_capacity_utilization(trip: Trip) -> float:
    """
    Score capacity utilization: how well is the vehicle filled?
    100 = 80-95% full (ideal), lower for under/over utilization.
    """
    if not trip.assets:
        return 0.0

    # Estimate total weight from assets
    weight_estimates = {
        "heated_bench": 150,
        "cooling_bench": 150,
        "hybrid_bench": 150,
        "dragon_shader": 200,
        "heated_foot_deck": 50,
    }
    total_weight = sum(
        weight_estimates.get(a.asset_type, 100)
        for a in trip.assets
    )

    # We don't have vehicle capacity in the trip data, estimate ~10000 lbs
    # Better scoring would need vehicle capacity from the model
    estimated_capacity = 10000
    utilization = total_weight / estimated_capacity

    # Ideal range: 50-90% utilization
    if 0.5 <= utilization <= 0.9:
        return 100.0
    elif utilization > 0.9:
        # Slightly over-utilized (but still within capacity)
        return max(60, 100 - (utilization - 0.9) * 200)
    else:
        # Under-utilized
        return max(20, utilization / 0.5 * 100)


def _score_time_efficiency(trip: Trip) -> float:
    """
    Score time efficiency: drive time vs DOT limits.
    100 = within comfortable limits, lower as we approach max.
    """
    if trip.total_drive_hrs <= 0:
        return 100.0

    max_drive_hrs = 11  # DOT limit
    ratio = trip.total_drive_hrs / max_drive_hrs

    if ratio <= 0.7:
        return 100.0  # Comfortable margin
    elif ratio <= 0.9:
        return 80.0 + (0.9 - ratio) / 0.2 * 20  # 80-100
    elif ratio <= 1.0:
        return 50.0 + (1.0 - ratio) / 0.1 * 30  # 50-80
    else:
        return max(0, 50 - (ratio - 1.0) * 100)  # Over DOT limit


def _score_constraint_satisfaction(result: OptimizationResult) -> float:
    """
    Score based on constraint relaxations.
    100 = no relaxations, lower for each relaxation step applied.
    """
    if not result.constraint_relaxations:
        return 100.0

    # Each relaxation step reduces the score
    penalties = {
        "relaxed_soft_constraints": 10,
        "relaxed_branding": 20,
        "split_multi_stop": 15,
        "cross_hub_assignments": 25,
        "partial_solution": 30,
    }

    total_penalty = 0
    for relaxation in result.constraint_relaxations:
        action = relaxation.get("action", "")
        total_penalty += penalties.get(action, 10)

    return max(0, 100 - total_penalty)


def _score_multi_stop_bonus(trip: Trip) -> float:
    """
    Bonus score for multi-stop trips (more efficient than single-stop).
    """
    num_stops = len(trip.stops)
    if num_stops <= 1:
        return 50.0  # Neutral — single stop is normal
    elif num_stops == 2:
        return 75.0
    elif num_stops == 3:
        return 90.0
    else:
        return 100.0  # 4+ stops is excellent efficiency


def score_trip(
    trip: Trip,
    dist_matrix: DistanceMatrix,
    result: OptimizationResult,
) -> float:
    """
    Calculate a quality score (0-100) for a single trip.

    Combines weighted scores from:
    - Distance efficiency (40%)
    - Capacity utilization (20%)
    - Time efficiency (15%)
    - Constraint satisfaction (15%)
    - Multi-stop bonus (10%)
    """
    distance_score = _score_distance_efficiency(trip, dist_matrix)
    capacity_score = _score_capacity_utilization(trip)
    time_score = _score_time_efficiency(trip)
    constraint_score = _score_constraint_satisfaction(result)
    multi_stop_score = _score_multi_stop_bonus(trip)

    total = (
        distance_score * WEIGHT_DISTANCE
        + capacity_score * WEIGHT_CAPACITY
        + time_score * WEIGHT_TIME
        + constraint_score * WEIGHT_CONSTRAINTS
        + multi_stop_score * WEIGHT_MULTI_STOP
    )

    return round(max(0, min(100, total)), 1)


def score_run(
    result: OptimizationResult,
    dist_matrix: DistanceMatrix,
) -> OptimizationResult:
    """
    Score all trips in an optimization result and compute average.

    Updates each trip's optimizer_score and the result's average_score.
    """
    if not result.trips:
        result.average_score = 0.0 if result.has_unassigned else 100.0
        return result

    total_score = 0.0
    for trip in result.trips:
        trip.optimizer_score = score_trip(trip, dist_matrix, result)
        total_score += trip.optimizer_score

    result.average_score = round(total_score / len(result.trips), 1)

    # Penalty for unassigned demands
    if result.unassigned_demands:
        penalty = min(30, len(result.unassigned_demands) * 5)
        result.average_score = max(0, result.average_score - penalty)

    return result
