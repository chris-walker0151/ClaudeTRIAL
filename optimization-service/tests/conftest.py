"""
Shared test fixtures for the optimization service tests.

Loads JSON fixture files and converts them to WeekData objects
for use in unit and integration tests.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from solver.data_loader import (
    Asset, AssetAssignment, BrandingTask, ContractItem, Game, Hub,
    LatLng, Person, Vehicle, Venue, WeekData,
)
from solver.distance_matrix import DistanceMatrix, get_distance_matrix


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _load_fixture(name: str) -> dict:
    """Load a JSON fixture file."""
    filepath = FIXTURES_DIR / name
    with open(filepath) as f:
        return json.load(f)


def _fixture_to_week_data(data: dict) -> WeekData:
    """Convert a fixture dict to a WeekData object."""
    wd = WeekData(
        season_year=data["season_year"],
        week_number=data["week_number"],
    )

    # Hubs
    wd.hubs = [
        Hub(
            id=h["id"], name=h["name"], city=h["city"],
            state=h["state"], address=h["address"],
            lat=float(h["lat"]), lng=float(h["lng"]),
        )
        for h in data.get("hubs", [])
    ]

    # Venues
    venue_map: dict[str, Venue] = {}
    for v in data.get("venues", []):
        venue = Venue(
            id=v["id"],
            customer_id=v.get("customer_id"),
            name=v["name"],
            address=v.get("address"),
            city=v.get("city"),
            state=v.get("state"),
            lat=float(v["lat"]) if v.get("lat") else None,
            lng=float(v["lng"]) if v.get("lng") else None,
            is_primary=v.get("is_primary", False),
        )
        venue_map[v["id"]] = venue

    # Games
    for g in data.get("games", []):
        wd.games.append(Game(
            id=g["id"],
            customer_id=g["customer_id"],
            customer_name=g["customer_name"],
            venue_id=g.get("venue_id"),
            venue=venue_map.get(g.get("venue_id", "")),
            season_year=g["season_year"],
            week_number=g["week_number"],
            game_date=g["game_date"],
            game_time=g.get("game_time"),
            opponent=g.get("opponent"),
            is_home_game=g.get("is_home_game", True),
            sidelines_served=g.get("sidelines_served", "both"),
            season_phase=g.get("season_phase", "regular"),
        ))

    # Contract items
    for ci in data.get("contract_items", []):
        wd.contract_items.append(ContractItem(
            id=ci["id"],
            contract_id=ci["contract_id"],
            customer_id=ci["customer_id"],
            customer_name=ci["customer_name"],
            asset_type=ci["asset_type"],
            model_version=ci.get("model_version"),
            quantity=ci["quantity"],
            branding_spec=ci.get("branding_spec"),
        ))

    # Assets
    for a in data.get("assets", []):
        wd.assets.append(Asset(
            id=a["id"],
            serial_number=a["serial_number"],
            asset_type=a["asset_type"],
            model_version=a.get("model_version"),
            condition=a.get("condition", "good"),
            status=a.get("status", "at_hub"),
            home_hub_id=a["home_hub_id"],
            current_hub=a.get("current_hub"),
            current_venue_id=a.get("current_venue_id"),
            current_trip_id=a.get("current_trip_id"),
            weight_lbs=float(a["weight_lbs"]) if a.get("weight_lbs") else None,
            current_branding=a.get("current_branding"),
        ))

    # Vehicles
    for v in data.get("vehicles", []):
        wd.vehicles.append(Vehicle(
            id=v["id"], name=v["name"], type=v.get("type"),
            home_hub_id=v["home_hub_id"],
            capacity_lbs=v.get("capacity_lbs"),
            capacity_cuft=v.get("capacity_cuft"),
            status=v["status"],
        ))

    # Personnel
    for p in data.get("personnel", []):
        wd.personnel.append(Person(
            id=p["id"], name=p["name"], role=p["role"],
            home_hub_id=p["home_hub_id"],
            skills=p.get("skills"),
            max_drive_hrs=p.get("max_drive_hrs", 11),
        ))

    # Branding tasks
    for bt in data.get("branding_tasks", []):
        wd.branding_tasks.append(BrandingTask(
            id=bt["id"], asset_id=bt["asset_id"],
            from_branding=bt.get("from_branding"),
            to_branding=bt.get("to_branding"),
            hub_id=bt["hub_id"],
            needed_by_date=bt.get("needed_by_date"),
            status=bt["status"],
        ))

    # Asset assignments
    for aa in data.get("asset_assignments", []):
        wd.asset_assignments.append(AssetAssignment(
            id=aa["id"], asset_id=aa["asset_id"],
            customer_id=aa["customer_id"],
            season_year=aa["season_year"],
            is_permanent=aa.get("is_permanent", False),
        ))

    return wd


@pytest.fixture
def single_stop_data() -> WeekData:
    """Load single_stop fixture as WeekData."""
    return _fixture_to_week_data(_load_fixture("single_stop.json"))


@pytest.fixture
def multi_stop_data() -> WeekData:
    """Load multi_stop fixture as WeekData."""
    return _fixture_to_week_data(_load_fixture("multi_stop.json"))


@pytest.fixture
def capacity_overflow_data() -> WeekData:
    """Load capacity_overflow fixture as WeekData."""
    return _fixture_to_week_data(_load_fixture("capacity_overflow.json"))


@pytest.fixture
def infeasible_week_data() -> WeekData:
    """Load infeasible_week fixture as WeekData."""
    return _fixture_to_week_data(_load_fixture("infeasible_week.json"))


@pytest.fixture
def branding_conflict_data() -> WeekData:
    """Load branding_conflict fixture as WeekData."""
    return _fixture_to_week_data(_load_fixture("branding_conflict.json"))


def build_test_dist_matrix(week_data: WeekData) -> DistanceMatrix:
    """
    Build a distance matrix using haversine estimates (no API calls).
    Used for testing without Google Maps API.
    """
    locations = week_data.get_all_locations()
    matrix = DistanceMatrix(locations)

    for i in range(len(locations)):
        for j in range(len(locations)):
            if i != j:
                estimate = DistanceMatrix._haversine_estimate(
                    locations[i], locations[j]
                )
                matrix.set(i, j, estimate)

    return matrix
