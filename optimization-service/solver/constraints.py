"""
Constraints module — hard + soft constraint definitions for the optimizer.

Hard constraints must be satisfied or the trip fails.
Soft constraints are optimized but can be relaxed during infeasibility handling.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

import config
from solver.data_loader import (
    Asset, BrandingTask, ContractItem, Game, Hub, Person, Vehicle, WeekData,
)
from solver.distance_matrix import DistanceMatrix


@dataclass
class TimeWindow:
    """Time window for a stop (earliest arrival, latest departure)."""
    earliest_arrival: datetime
    latest_arrival: datetime
    service_time_minutes: int = 60  # setup/teardown time at venue


@dataclass
class Demand:
    """Equipment demand for a game at a venue."""
    game: Game
    venue_id: str
    customer_id: str
    customer_name: str
    items: list[ContractItem]
    total_quantity: int
    total_weight_lbs: float
    time_window: TimeWindow | None = None


@dataclass
class Constraints:
    """Complete constraint set for the optimizer."""
    # Hard constraints
    demands: list[Demand] = field(default_factory=list)
    time_windows: dict[str, TimeWindow] = field(default_factory=dict)  # venue_id -> TimeWindow
    max_drive_hrs: int = 11  # DOT regulation
    setup_buffer_hours: float = 4.0  # must arrive this many hours before game
    teardown_buffer_hours: float = 3.0  # cannot leave until this many hours after game

    # Soft constraint weights (higher = more important)
    weight_minimize_miles: float = 1.0
    weight_minimize_vehicles: float = 0.8
    weight_prefer_closest_hub: float = 0.6
    weight_minimize_rebranding: float = 0.7
    weight_geographic_clustering: float = 0.5

    # Assets with pending branding tasks (cannot be assigned)
    blocked_asset_ids: set[str] = field(default_factory=set)

    # Hub capacity info
    hub_vehicle_counts: dict[str, int] = field(default_factory=dict)
    hub_personnel_counts: dict[str, int] = field(default_factory=dict)

    def is_relaxed(self) -> bool:
        """Check if any soft constraints have been relaxed."""
        return (
            self.weight_minimize_miles < 1.0
            or self.weight_minimize_vehicles < 0.8
            or self.weight_prefer_closest_hub < 0.6
            or self.weight_minimize_rebranding < 0.7
        )


def build_constraints(week_data: WeekData) -> Constraints:
    """
    Build the complete constraint set from week data.

    Processes:
    - Game schedules into demands with time windows
    - Vehicle/personnel availability into capacity constraints
    - Branding tasks into blocked asset lists
    """
    constraints = Constraints(
        setup_buffer_hours=config.SETUP_BUFFER_HOURS,
        teardown_buffer_hours=config.TEARDOWN_BUFFER_HOURS,
    )

    # Build demands from games + contract items
    for game in week_data.games:
        items = week_data.demands_for_game(game)
        if not items or not game.venue_id:
            continue

        total_qty = sum(item.quantity for item in items)
        # Estimate weight: ~150 lbs per heated_bench, ~50 lbs per foot_deck, ~200 lbs per shader
        weight_estimates = {
            "heated_bench": 150,
            "cooling_bench": 150,
            "hybrid_bench": 150,
            "dragon_shader": 200,
            "heated_foot_deck": 50,
        }
        total_weight = sum(
            item.quantity * weight_estimates.get(item.asset_type, 100)
            for item in items
        )

        # Build time window from game time (skip for Week 0 — no time crunch)
        tw = None
        is_week0 = week_data.week_number == 0
        if not is_week0 and game.game_date and game.game_time:
            try:
                game_dt = datetime.strptime(
                    f"{game.game_date} {game.game_time}", "%Y-%m-%d %H:%M:%S"
                )
            except ValueError:
                try:
                    game_dt = datetime.strptime(
                        f"{game.game_date} {game.game_time}", "%Y-%m-%d %H:%M"
                    )
                except ValueError:
                    game_dt = None

            if game_dt:
                tw = TimeWindow(
                    earliest_arrival=game_dt - timedelta(hours=24),
                    latest_arrival=game_dt - timedelta(hours=constraints.setup_buffer_hours),
                    service_time_minutes=60,
                )
                constraints.time_windows[game.venue_id] = tw

        demand = Demand(
            game=game,
            venue_id=game.venue_id,
            customer_id=game.customer_id,
            customer_name=game.customer_name,
            items=items,
            total_quantity=total_qty,
            total_weight_lbs=total_weight,
            time_window=tw,
        )
        constraints.demands.append(demand)

    # Identify blocked assets (pending branding tasks)
    for bt in week_data.branding_tasks:
        if bt.status in ("pending", "in_progress"):
            constraints.blocked_asset_ids.add(bt.asset_id)

    # Count vehicles/personnel per hub
    for hub in week_data.hubs:
        constraints.hub_vehicle_counts[hub.id] = len(
            week_data.available_vehicles_at_hub(hub.id)
        )
        constraints.hub_personnel_counts[hub.id] = len(
            week_data.available_personnel_at_hub(hub.id)
        )

    return constraints


def check_capacity(vehicle: Vehicle, assets: list[Asset]) -> bool:
    """Check if a vehicle can carry the given assets (weight check)."""
    if not vehicle.capacity_lbs:
        return True  # No capacity limit defined

    total_weight = sum(a.weight_lbs or 0 for a in assets)
    return total_weight <= vehicle.capacity_lbs


def check_capacity_weight(vehicle: Vehicle, total_weight: float) -> bool:
    """Check if a vehicle can carry the given weight."""
    if not vehicle.capacity_lbs:
        return True
    return total_weight <= vehicle.capacity_lbs


def check_branding(
    asset: Asset,
    customer_name: str,
    branding_spec: str | None,
    branding_tasks: list[BrandingTask],
) -> bool:
    """
    Check if an asset's branding matches the customer's requirement.

    Returns True if:
    - No branding spec required
    - Asset branding matches the spec
    - Asset has no branding (can be branded)
    """
    if not branding_spec:
        return True
    if not asset.current_branding:
        return True  # Unbranded assets can be used
    if asset.current_branding == branding_spec:
        return True
    # Check if there's a pending branding task to fix this
    for bt in branding_tasks:
        if bt.asset_id == asset.id and bt.to_branding == branding_spec:
            if bt.status == "completed":
                return True
    return False


def check_drive_time(
    duration_minutes: float, max_drive_hrs: int = 11
) -> bool:
    """Check if drive time is within DOT limits."""
    return duration_minutes <= max_drive_hrs * 60


def check_time_window(
    arrival_time: datetime, time_window: TimeWindow | None
) -> bool:
    """Check if arrival time falls within the allowed window."""
    if not time_window:
        return True
    return time_window.earliest_arrival <= arrival_time <= time_window.latest_arrival


def match_asset_to_demand(
    asset: Asset,
    demand_item: ContractItem,
    blocked_ids: set[str],
    branding_tasks: list[BrandingTask],
) -> bool:
    """
    Check if an asset can fulfill a specific demand item.

    Checks: type match, model match, not blocked, branding match.
    """
    # Must not be blocked (pending branding)
    if asset.id in blocked_ids:
        return False

    # Must be in usable condition
    if asset.condition in ("out_of_service", "needs_repair"):
        return False

    # Asset type must match
    if asset.asset_type != demand_item.asset_type:
        return False

    # Model version must match if specified
    if demand_item.model_version and asset.model_version != demand_item.model_version:
        return False

    # Branding must match if specified
    if not check_branding(
        asset, demand_item.customer_name, demand_item.branding_spec, branding_tasks
    ):
        return False

    return True
