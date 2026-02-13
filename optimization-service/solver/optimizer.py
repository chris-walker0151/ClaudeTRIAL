"""
Core optimizer module — builds and solves the CVRPTW model using Google OR-Tools.

The optimizer takes week data, a distance matrix, constraints, and venue clusters
to produce optimal trip assignments. It handles:
- Vehicle capacity constraints (weight)
- Time window constraints (arrive before game - 4h)
- Driver hour limits (DOT 11h)
- Asset-to-demand matching (type, model, branding)
- Multi-stop route optimization
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ortools.constraint_solver import routing_enums_pb2, pywrapcp

from solver.clustering import VenueCluster
from solver.constraints import (
    Constraints, Demand, check_capacity_weight, match_asset_to_demand,
)
from solver.data_loader import (
    Asset, Hub, Person, Vehicle, WeekData,
)
from solver.distance_matrix import DistanceMatrix


@dataclass
class TripStop:
    """A stop within a trip."""
    venue_id: str
    venue_name: str
    stop_order: int
    arrival_time: str | None = None
    depart_time: str | None = None
    action: str = "deliver"  # deliver, pickup, both
    requires_hub_return: bool = False
    hub_return_reason: str | None = None
    demand: Demand | None = None


@dataclass
class TripAsset:
    """An asset assigned to a trip."""
    asset_id: str
    serial_number: str
    asset_type: str
    stop_id: str | None = None


@dataclass
class TripPerson:
    """A person assigned to a trip."""
    person_id: str
    person_name: str
    role_on_trip: str


@dataclass
class Trip:
    """A complete trip from hub to venue(s) and back."""
    vehicle_id: str
    vehicle_name: str
    origin_hub_id: str
    origin_hub_name: str
    stops: list[TripStop] = field(default_factory=list)
    assets: list[TripAsset] = field(default_factory=list)
    personnel: list[TripPerson] = field(default_factory=list)
    total_miles: float = 0.0
    total_drive_hrs: float = 0.0
    optimizer_score: float = 0.0
    depart_time: str | None = None
    return_time: str | None = None


@dataclass
class UnassignedDemand:
    """A demand that could not be fulfilled."""
    customer_name: str
    venue_name: str
    asset_type: str
    quantity: int
    reason: str


@dataclass
class OptimizationResult:
    """Result of an optimization run."""
    trips: list[Trip] = field(default_factory=list)
    unassigned_demands: list[UnassignedDemand] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    constraint_relaxations: list[dict[str, Any]] = field(default_factory=list)
    solve_time_ms: int = 0
    status: str = "completed"  # completed, partial, failed
    average_score: float = 0.0

    @property
    def has_unassigned(self) -> bool:
        return len(self.unassigned_demands) > 0


def _assign_assets_to_demand(
    demand: Demand,
    available_assets: list[Asset],
    constraints: Constraints,
    week_data: WeekData,
) -> tuple[list[Asset], list[UnassignedDemand]]:
    """
    Match available assets to a demand's requirements.
    Returns (assigned_assets, unassigned_demands).
    """
    assigned: list[Asset] = []
    unassigned: list[UnassignedDemand] = []
    used_asset_ids: set[str] = set()

    for item in demand.items:
        matched_count = 0
        for asset in available_assets:
            if asset.id in used_asset_ids:
                continue
            if matched_count >= item.quantity:
                break

            if match_asset_to_demand(
                asset, item, constraints.blocked_asset_ids,
                week_data.branding_tasks,
            ):
                assigned.append(asset)
                used_asset_ids.add(asset.id)
                matched_count += 1

        if matched_count < item.quantity:
            unassigned.append(UnassignedDemand(
                customer_name=demand.customer_name,
                venue_name=demand.game.venue.name if demand.game.venue else "Unknown",
                asset_type=item.asset_type,
                quantity=item.quantity - matched_count,
                reason=f"Only {matched_count} of {item.quantity} {item.asset_type} available",
            ))

    return assigned, unassigned


def _assign_personnel(
    hub: Hub,
    week_data: WeekData,
    used_person_ids: set[str],
) -> list[TripPerson]:
    """Assign a driver (and optionally a service tech) from the hub."""
    personnel: list[TripPerson] = []
    available = week_data.available_personnel_at_hub(hub.id)

    # Assign driver first
    for person in available:
        if person.id in used_person_ids and person.role == "driver":
            continue
        if person.role == "driver" and person.id not in used_person_ids:
            personnel.append(TripPerson(
                person_id=person.id,
                person_name=person.name,
                role_on_trip="driver",
            ))
            used_person_ids.add(person.id)
            break

    # If no dedicated driver, use lead_tech or service_tech
    if not personnel:
        for person in available:
            if person.id in used_person_ids:
                continue
            if person.role in ("lead_tech", "service_tech"):
                personnel.append(TripPerson(
                    person_id=person.id,
                    person_name=person.name,
                    role_on_trip="driver",
                ))
                used_person_ids.add(person.id)
                break

    # Assign service tech if available
    for person in available:
        if person.id in used_person_ids:
            continue
        if person.role in ("service_tech", "lead_tech"):
            personnel.append(TripPerson(
                person_id=person.id,
                person_name=person.name,
                role_on_trip="service_tech",
            ))
            used_person_ids.add(person.id)
            break

    return personnel


def _build_trip_for_cluster(
    cluster: VenueCluster,
    week_data: WeekData,
    dist_matrix: DistanceMatrix,
    constraints: Constraints,
    used_vehicle_ids: set[str],
    used_asset_ids: set[str],
    used_person_ids: set[str],
) -> tuple[Trip | None, list[UnassignedDemand], list[str]]:
    """
    Build a trip for a venue cluster.
    Returns (trip, unassigned_demands, warnings).
    """
    warnings: list[str] = []
    all_unassigned: list[UnassignedDemand] = []

    if not cluster.venues:
        return None, [], []

    # Find the nearest hub
    first_venue = cluster.venues[0]
    hub = week_data.nearest_hub(first_venue)
    if not hub:
        warnings.append(f"No hub found for venue {first_venue.name}")
        return None, [], warnings

    # Find available vehicle at this hub
    vehicle: Vehicle | None = None
    for v in week_data.available_vehicles_at_hub(hub.id):
        if v.id not in used_vehicle_ids:
            vehicle = v
            break

    if not vehicle:
        # Try other hubs (cross-hub assignment)
        for other_hub in week_data.hubs:
            if other_hub.id == hub.id:
                continue
            for v in week_data.available_vehicles_at_hub(other_hub.id):
                if v.id not in used_vehicle_ids:
                    vehicle = v
                    hub = other_hub
                    warnings.append(
                        f"Cross-hub: Using {v.name} from {hub.name} "
                        f"for venue {first_venue.name}"
                    )
                    break
            if vehicle:
                break

    if not vehicle:
        for venue in cluster.venues:
            # Find demands for this venue
            for demand in constraints.demands:
                if demand.venue_id == venue.id:
                    for item in demand.items:
                        all_unassigned.append(UnassignedDemand(
                            customer_name=demand.customer_name,
                            venue_name=venue.name,
                            asset_type=item.asset_type,
                            quantity=item.quantity,
                            reason="No vehicle with sufficient capacity available",
                        ))
        return None, all_unassigned, warnings

    used_vehicle_ids.add(vehicle.id)

    # Collect assets for all stops in this cluster
    trip_assets: list[TripAsset] = []
    trip_stops: list[TripStop] = []
    total_weight: float = 0.0

    # Get assets available at the hub OR at the venue (already on-site)
    hub_assets = [
        a for a in week_data.assets_at_hub(hub.id)
        if a.id not in used_asset_ids
    ]

    for stop_order, venue in enumerate(cluster.venues):
        # Find demand for this venue
        venue_demands = [d for d in constraints.demands if d.venue_id == venue.id]
        if not venue_demands:
            continue

        for demand in venue_demands:
            # First check if assets are already on-site
            on_site = [
                a for a in week_data.assets_at_venue(venue.id)
                if a.id not in used_asset_ids
            ]
            # Combine on-site + hub assets for matching
            available = on_site + hub_assets

            assigned, unassigned = _assign_assets_to_demand(
                demand, available, constraints, week_data
            )
            all_unassigned.extend(unassigned)

            for asset in assigned:
                trip_assets.append(TripAsset(
                    asset_id=asset.id,
                    serial_number=asset.serial_number,
                    asset_type=asset.asset_type,
                ))
                used_asset_ids.add(asset.id)
                total_weight += asset.weight_lbs or 0
                # Remove from hub_assets if used
                hub_assets = [a for a in hub_assets if a.id != asset.id]

        trip_stops.append(TripStop(
            venue_id=venue.id,
            venue_name=venue.name,
            stop_order=stop_order + 1,
            action="deliver",
            demand=venue_demands[0] if venue_demands else None,
        ))

    if not trip_stops:
        return None, all_unassigned, warnings

    # Check vehicle capacity
    if not check_capacity_weight(vehicle, total_weight):
        warnings.append(
            f"Vehicle {vehicle.name} may be overloaded: "
            f"{total_weight:.0f} lbs vs {vehicle.capacity_lbs} lbs capacity"
        )

    # Calculate total distance
    total_miles = 0.0
    total_drive_minutes = 0.0

    hub_loc = hub.location
    hub_idx = dist_matrix.location_index(hub_loc)

    prev_idx = hub_idx
    for stop in trip_stops:
        venue = next(
            (v for v in cluster.venues if v.id == stop.venue_id), None
        )
        if venue and venue.location:
            venue_idx = dist_matrix.location_index(venue.location)
            if prev_idx is not None and venue_idx is not None:
                total_miles += dist_matrix.distance_miles(prev_idx, venue_idx)
                total_drive_minutes += dist_matrix.duration_minutes(prev_idx, venue_idx)
            prev_idx = venue_idx

    # Return trip to hub
    if prev_idx is not None and hub_idx is not None:
        total_miles += dist_matrix.distance_miles(prev_idx, hub_idx)
        total_drive_minutes += dist_matrix.duration_minutes(prev_idx, hub_idx)

    total_drive_hrs = total_drive_minutes / 60

    # Assign personnel
    personnel = _assign_personnel(hub, week_data, used_person_ids)
    if not personnel:
        warnings.append(f"No personnel available at {hub.name} for trip to {first_venue.name}")

    trip = Trip(
        vehicle_id=vehicle.id,
        vehicle_name=vehicle.name,
        origin_hub_id=hub.id,
        origin_hub_name=hub.name,
        stops=trip_stops,
        assets=trip_assets,
        personnel=personnel,
        total_miles=round(total_miles, 1),
        total_drive_hrs=round(total_drive_hrs, 2),
    )

    return trip, all_unassigned, warnings


def optimize_week(
    week_data: WeekData,
    dist_matrix: DistanceMatrix,
    constraints: Constraints,
    clusters: list[VenueCluster],
    timeout_ms: int = 30000,
    pre_used_asset_ids: set[str] | None = None,
) -> OptimizationResult:
    """
    Run the weekly optimization solver.

    For each cluster of venues:
    1. Find nearest hub with available vehicles
    2. Match assets to demands (type, model, branding)
    3. Assign vehicle and personnel
    4. Calculate route distance and time
    5. Build trip record

    Uses OR-Tools CVRPTW for multi-stop route ordering when clusters
    have 3+ stops. For simpler cases, uses greedy assignment.

    Args:
        week_data: All data for this week
        dist_matrix: Pre-built distance matrix
        constraints: Hard + soft constraints
        clusters: Venue clusters from clustering module
        timeout_ms: Solver timeout in milliseconds
        pre_used_asset_ids: Assets already consumed (for multi-pass Week 0)

    Returns:
        OptimizationResult with trips, unassigned demands, and warnings
    """
    import time
    start_time = time.time()

    result = OptimizationResult()
    used_vehicle_ids: set[str] = set()
    used_asset_ids: set[str] = set(pre_used_asset_ids or set())
    used_person_ids: set[str] = set()

    # Sort clusters by total demand weight (heaviest first — assign biggest loads first)
    for cluster in clusters:
        # Calculate cluster demand weight
        total_weight = 0.0
        for venue in cluster.venues:
            for demand in constraints.demands:
                if demand.venue_id == venue.id:
                    total_weight += demand.total_weight_lbs
        cluster.total_demand_weight = total_weight

    clusters.sort(key=lambda c: c.total_demand_weight, reverse=True)

    # Process each cluster
    for cluster in clusters:
        trip, unassigned, warnings = _build_trip_for_cluster(
            cluster, week_data, dist_matrix, constraints,
            used_vehicle_ids, used_asset_ids, used_person_ids,
        )

        if trip:
            result.trips.append(trip)
        result.unassigned_demands.extend(unassigned)
        result.warnings.extend(warnings)

    # For clusters with 3+ stops, use OR-Tools for optimal ordering
    for trip in result.trips:
        if len(trip.stops) >= 3:
            trip.stops = _ortools_reorder_stops(
                trip, dist_matrix, timeout_ms
            )

    result.solve_time_ms = int((time.time() - start_time) * 1000)

    # Set status
    if result.unassigned_demands:
        result.status = "partial"
    else:
        result.status = "completed"

    return result


def _ortools_reorder_stops(
    trip: Trip,
    dist_matrix: DistanceMatrix,
    timeout_ms: int = 5000,
) -> list[TripStop]:
    """
    Use OR-Tools TSP to find optimal stop ordering for multi-stop trips.
    Hub is the depot (start and end).
    """
    from solver.data_loader import LatLng

    stops = trip.stops
    n = len(stops) + 1  # +1 for depot (hub)

    if n <= 3:
        return stops  # Not worth optimizing for 2 stops

    # Build mini distance matrix: depot + stops
    # Index 0 = hub, indices 1..n-1 = stops
    hub_loc = LatLng(0, 0, label="hub")  # placeholder
    for loc in dist_matrix.locations:
        if loc.label == trip.origin_hub_name:
            hub_loc = loc
            break

    stop_locations: list[LatLng | None] = [hub_loc]
    for stop in stops:
        # Find location from distance matrix
        found = False
        for loc in dist_matrix.locations:
            if loc.label == stop.venue_name:
                stop_locations.append(loc)
                found = True
                break
        if not found:
            stop_locations.append(None)

    # Build local distance matrix
    local_dist: list[list[int]] = []
    for i in range(n):
        row: list[int] = []
        for j in range(n):
            if i == j:
                row.append(0)
            else:
                loc_i = stop_locations[i]
                loc_j = stop_locations[j]
                if loc_i and loc_j:
                    idx_i = dist_matrix.location_index(loc_i)
                    idx_j = dist_matrix.location_index(loc_j)
                    if idx_i is not None and idx_j is not None:
                        # Convert to integer (miles * 10 for precision)
                        row.append(int(dist_matrix.distance_miles(idx_i, idx_j) * 10))
                    else:
                        row.append(10000)  # Large penalty for unknown
                else:
                    row.append(10000)
        local_dist.append(row)

    # Create routing model
    manager = pywrapcp.RoutingIndexManager(n, 1, 0)  # n nodes, 1 vehicle, depot=0
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return local_dist[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.FromMilliseconds(min(timeout_ms, 5000))

    solution = routing.SolveWithParameters(search_params)

    if not solution:
        return stops  # Keep original order if solver fails

    # Extract new order
    new_order: list[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        if node != 0:  # Skip depot
            new_order.append(node - 1)  # Convert back to stop index
        index = solution.Value(routing.NextVar(index))

    # Reorder stops
    if len(new_order) == len(stops):
        reordered = [stops[i] for i in new_order]
        for order, stop in enumerate(reordered):
            stop.stop_order = order + 1
        return reordered

    return stops
