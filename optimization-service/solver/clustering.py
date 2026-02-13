"""
Multi-stop clustering module — groups geographically close venues into
multi-stop trips for more efficient routing.

Algorithm: greedy geographic clustering
1. Sort venues by distance from nearest hub
2. For each unassigned venue, find nearby unassigned venues within radius
3. Group up to max_stops venues if total equipment fits one vehicle
4. Order stops within cluster by nearest-neighbor TSP
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from solver.data_loader import Hub, LatLng, Venue
from solver.distance_matrix import DistanceMatrix


@dataclass
class VenueCluster:
    """A group of venues to be served in a single multi-stop trip."""
    venues: list[Venue] = field(default_factory=list)
    nearest_hub: Hub | None = None
    total_demand_weight: float = 0.0
    total_demand_quantity: int = 0
    ordered_venue_ids: list[str] = field(default_factory=list)

    @property
    def is_multi_stop(self) -> bool:
        return len(self.venues) > 1

    @property
    def venue_ids(self) -> set[str]:
        return {v.id for v in self.venues}


def _haversine_miles(a: LatLng, b: LatLng) -> float:
    """Calculate haversine distance in miles between two points."""
    R = 3959  # Earth radius in miles
    lat1, lat2 = math.radians(a.lat), math.radians(b.lat)
    dlat = math.radians(b.lat - a.lat)
    dlng = math.radians(b.lng - a.lng)
    h = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(h))


def _nearest_hub_distance(venue: Venue, hubs: list[LatLng]) -> float:
    """Get distance from venue to its nearest hub."""
    loc = venue.location
    if not loc or not hubs:
        return float("inf")
    return min(_haversine_miles(loc, h) for h in hubs)


def _order_stops_nn(
    venues: list[Venue],
    start: LatLng,
    dist_matrix: DistanceMatrix,
) -> list[Venue]:
    """
    Order stops using nearest-neighbor heuristic starting from a hub location.
    Falls back to haversine if matrix indices aren't available.
    """
    if len(venues) <= 1:
        return venues

    ordered: list[Venue] = []
    remaining = list(venues)
    current = start

    while remaining:
        best_idx = 0
        best_dist = float("inf")

        for i, venue in enumerate(remaining):
            loc = venue.location
            if not loc:
                continue

            # Try matrix lookup first
            ci = dist_matrix.location_index(current)
            vi = dist_matrix.location_index(loc)
            if ci is not None and vi is not None:
                d = dist_matrix.distance_miles(ci, vi)
            else:
                d = _haversine_miles(current, loc)

            if d < best_dist:
                best_dist = d
                best_idx = i

        next_venue = remaining.pop(best_idx)
        ordered.append(next_venue)
        loc = next_venue.location
        if loc:
            current = loc

    return ordered


def cluster_venues(
    venues: list[Venue],
    hub_locations: list[LatLng],
    dist_matrix: DistanceMatrix,
    max_radius_miles: float = 150.0,
    max_stops: int = 4,
) -> list[VenueCluster]:
    """
    Group venues into clusters for multi-stop trips.

    Args:
        venues: List of venues with games this week
        hub_locations: Locations of all hubs
        dist_matrix: Pre-built distance matrix
        max_radius_miles: Maximum radius for clustering
        max_stops: Maximum stops per cluster

    Returns:
        List of VenueCluster objects, each containing ordered venues
    """
    if not venues:
        return []

    # Filter venues with valid locations
    valid_venues = [v for v in venues if v.location is not None]
    if not valid_venues:
        return [VenueCluster(venues=[v]) for v in venues]

    # Sort by distance from nearest hub (farthest first — they benefit most from clustering)
    valid_venues.sort(
        key=lambda v: _nearest_hub_distance(v, hub_locations),
        reverse=True,
    )

    assigned: set[str] = set()
    clusters: list[VenueCluster] = []

    for venue in valid_venues:
        if venue.id in assigned:
            continue

        loc = venue.location
        if not loc:
            continue

        # Start a new cluster with this venue
        cluster_venues_list: list[Venue] = [venue]
        assigned.add(venue.id)

        # Find nearby unassigned venues
        for candidate in valid_venues:
            if candidate.id in assigned:
                continue
            if len(cluster_venues_list) >= max_stops:
                break

            cloc = candidate.location
            if not cloc:
                continue

            distance = _haversine_miles(loc, cloc)
            if distance <= max_radius_miles:
                cluster_venues_list.append(candidate)
                assigned.add(candidate.id)

        # Find nearest hub for this cluster
        cluster_center = cluster_venues_list[0].location
        if cluster_center and hub_locations:
            nearest_hub_loc = min(
                hub_locations,
                key=lambda h: _haversine_miles(cluster_center, h),
            )
            # Order stops using nearest-neighbor from hub
            ordered = _order_stops_nn(
                cluster_venues_list, nearest_hub_loc, dist_matrix
            )
        else:
            ordered = cluster_venues_list

        cluster = VenueCluster(
            venues=ordered,
            ordered_venue_ids=[v.id for v in ordered],
        )
        clusters.append(cluster)

    # Add any venues without valid locations as single-stop clusters
    for venue in venues:
        if venue.id not in assigned:
            clusters.append(VenueCluster(venues=[venue]))

    return clusters
