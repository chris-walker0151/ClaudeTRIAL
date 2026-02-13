"""
Data loader module — reads all required data from Supabase for a given week.

Uses the PostgREST client to query Supabase tables directly via the REST API.
All queries use the service role key to bypass Row Level Security.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import httpx

import config


@dataclass
class LatLng:
    """Geographic coordinate."""
    lat: float
    lng: float
    label: str = ""  # e.g., hub name or venue name

    def __hash__(self) -> int:
        return hash((round(self.lat, 6), round(self.lng, 6)))

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, LatLng):
            return False
        return (
            round(self.lat, 6) == round(other.lat, 6)
            and round(self.lng, 6) == round(other.lng, 6)
        )


@dataclass
class Hub:
    """Distribution hub."""
    id: str
    name: str
    city: str
    state: str
    address: str
    lat: float
    lng: float

    @property
    def location(self) -> LatLng:
        return LatLng(self.lat, self.lng, label=self.name)


@dataclass
class Venue:
    """Game venue."""
    id: str
    customer_id: str | None
    name: str
    address: str | None
    city: str | None
    state: str | None
    lat: float | None
    lng: float | None
    is_primary: bool

    @property
    def location(self) -> LatLng | None:
        if self.lat is not None and self.lng is not None:
            return LatLng(self.lat, self.lng, label=self.name)
        return None


@dataclass
class Customer:
    """Customer (team)."""
    id: str
    name: str
    sport_type: str


@dataclass
class Game:
    """Scheduled game for a specific week."""
    id: str
    customer_id: str
    customer_name: str
    venue_id: str | None
    venue: Venue | None
    season_year: int
    week_number: int
    game_date: str
    game_time: str | None
    opponent: str | None
    is_home_game: bool
    sidelines_served: str
    season_phase: str


@dataclass
class ContractItem:
    """Equipment requirement from a contract."""
    id: str
    contract_id: str
    customer_id: str
    customer_name: str
    asset_type: str
    model_version: str | None
    quantity: int
    branding_spec: str | None


@dataclass
class Asset:
    """Physical equipment piece."""
    id: str
    serial_number: str
    asset_type: str
    model_version: str | None
    condition: str
    status: str
    home_hub_id: str
    current_hub: str | None
    current_venue_id: str | None
    current_trip_id: str | None
    weight_lbs: float | None
    current_branding: str | None


@dataclass
class Vehicle:
    """Transport vehicle."""
    id: str
    name: str
    type: str | None
    home_hub_id: str
    capacity_lbs: int | None
    capacity_cuft: int | None
    status: str


@dataclass
class Person:
    """Personnel member."""
    id: str
    name: str
    role: str
    home_hub_id: str
    skills: list[str] | None
    max_drive_hrs: int


@dataclass
class BrandingTask:
    """Pending branding task."""
    id: str
    asset_id: str
    from_branding: str | None
    to_branding: str | None
    hub_id: str
    needed_by_date: str | None
    status: str


@dataclass
class AssetAssignment:
    """Asset-to-customer assignment for a season."""
    id: str
    asset_id: str
    customer_id: str
    season_year: int
    is_permanent: bool


@dataclass
class WeekData:
    """All data needed to optimize a single week."""
    season_year: int
    week_number: int
    games: list[Game] = field(default_factory=list)
    contract_items: list[ContractItem] = field(default_factory=list)
    assets: list[Asset] = field(default_factory=list)
    vehicles: list[Vehicle] = field(default_factory=list)
    personnel: list[Person] = field(default_factory=list)
    hubs: list[Hub] = field(default_factory=list)
    branding_tasks: list[BrandingTask] = field(default_factory=list)
    asset_assignments: list[AssetAssignment] = field(default_factory=list)

    @property
    def game_venues(self) -> list[Venue]:
        """Unique venues that have games this week."""
        seen: set[str] = set()
        venues: list[Venue] = []
        for game in self.games:
            if game.venue and game.venue_id and game.venue_id not in seen:
                seen.add(game.venue_id)
                venues.append(game.venue)
        return venues

    @property
    def hub_locations(self) -> list[LatLng]:
        """Locations of all hubs."""
        return [hub.location for hub in self.hubs]

    def get_all_locations(self) -> list[LatLng]:
        """All unique locations (hubs + game venues) for distance matrix."""
        locations: list[LatLng] = []
        seen: set[tuple[float, float]] = set()

        for hub in self.hubs:
            key = (round(hub.lat, 6), round(hub.lng, 6))
            if key not in seen:
                seen.add(key)
                locations.append(hub.location)

        for venue in self.game_venues:
            loc = venue.location
            if loc:
                key = (round(loc.lat, 6), round(loc.lng, 6))
                if key not in seen:
                    seen.add(key)
                    locations.append(loc)

        return locations

    def demands_for_game(self, game: Game) -> list[ContractItem]:
        """Get equipment demands for a specific game's customer."""
        return [
            ci for ci in self.contract_items
            if ci.customer_id == game.customer_id
        ]

    def assets_at_hub(self, hub_id: str) -> list[Asset]:
        """Get assets currently at a specific hub."""
        return [
            a for a in self.assets
            if a.status == "at_hub" and a.current_hub == hub_id
        ]

    def assets_at_venue(self, venue_id: str) -> list[Asset]:
        """Get assets currently at a specific venue."""
        return [
            a for a in self.assets
            if a.status == "on_site" and a.current_venue_id == venue_id
        ]

    def available_vehicles_at_hub(self, hub_id: str) -> list[Vehicle]:
        """Get available vehicles at a specific hub."""
        return [
            v for v in self.vehicles
            if v.home_hub_id == hub_id and v.status == "active"
        ]

    def available_personnel_at_hub(self, hub_id: str) -> list[Person]:
        """Get available personnel at a specific hub."""
        return [
            p for p in self.personnel
            if p.home_hub_id == hub_id
        ]

    def nearest_hub(self, venue: Venue) -> Hub | None:
        """Find the nearest hub to a venue (simple lat/lng distance)."""
        loc = venue.location
        if not loc or not self.hubs:
            return None
        return min(
            self.hubs,
            key=lambda h: (h.lat - loc.lat) ** 2 + (h.lng - loc.lng) ** 2,
        )


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


def _get(table: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
    """Execute a GET request against Supabase REST API."""
    response = httpx.get(
        _supabase_url(table),
        headers=_supabase_headers(),
        params=params or {},
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()


def load_week_data(season_year: int, week_number: int) -> WeekData:
    """
    Load all data needed to optimize a given week.

    For Week 0 (pre-season deployment), derives delivery targets from
    Week 1 games — no actual Week 0 rows needed in game_schedule.

    Queries Supabase for:
    - Games this week (with customer + venue info)
    - Contract items for customers with games
    - All assets with current locations
    - Available vehicles
    - Available personnel
    - Hub locations
    - Active branding tasks
    - Asset assignments for the season
    """
    # Week 0: pre-season deployment — derive from Week 1 games
    if week_number == 0:
        return _load_week0_data(season_year)

    week_data = WeekData(season_year=season_year, week_number=week_number)

    # 1. Load hubs
    hub_rows = _get("hubs")
    week_data.hubs = [
        Hub(
            id=r["id"], name=r["name"], city=r["city"],
            state=r["state"], address=r["address"],
            lat=float(r["lat"]), lng=float(r["lng"]),
        )
        for r in hub_rows
    ]
    hub_map = {h.id: h for h in week_data.hubs}

    # 2. Load games for this week with venue info
    game_rows = _get("game_schedule", {
        "season_year": f"eq.{season_year}",
        "week_number": f"eq.{week_number}",
        "select": "*, customers(id, name, sport_type), venues(id, customer_id, name, address, city, state, lat, lng, is_primary)",
    })

    customer_ids: set[str] = set()
    for r in game_rows:
        cust = r.get("customers") or {}
        ven_data = r.get("venues")
        venue = None
        if ven_data:
            venue = Venue(
                id=ven_data["id"],
                customer_id=ven_data.get("customer_id"),
                name=ven_data["name"],
                address=ven_data.get("address"),
                city=ven_data.get("city"),
                state=ven_data.get("state"),
                lat=float(ven_data["lat"]) if ven_data.get("lat") else None,
                lng=float(ven_data["lng"]) if ven_data.get("lng") else None,
                is_primary=ven_data.get("is_primary", False),
            )

        game = Game(
            id=r["id"],
            customer_id=r["customer_id"],
            customer_name=cust.get("name", ""),
            venue_id=r.get("venue_id"),
            venue=venue,
            season_year=r["season_year"],
            week_number=r["week_number"],
            game_date=r["game_date"],
            game_time=r.get("game_time"),
            opponent=r.get("opponent"),
            is_home_game=r.get("is_home_game", True),
            sidelines_served=r.get("sidelines_served", "both"),
            season_phase=r.get("season_phase", "regular"),
        )
        week_data.games.append(game)
        customer_ids.add(r["customer_id"])

    if not customer_ids:
        return week_data

    # 3. Load contract items for customers with games
    customer_filter = ",".join(customer_ids)
    contract_rows = _get("contracts", {
        "customer_id": f"in.({customer_filter})",
        "status": "eq.active",
        "select": "id, customer_id, customers(name), contract_items(id, asset_type, model_version, quantity, branding_spec)",
    })

    for cr in contract_rows:
        cust_name = (cr.get("customers") or {}).get("name", "")
        items = cr.get("contract_items") or []
        for item in items:
            week_data.contract_items.append(ContractItem(
                id=item["id"],
                contract_id=cr["id"],
                customer_id=cr["customer_id"],
                customer_name=cust_name,
                asset_type=item["asset_type"],
                model_version=item.get("model_version"),
                quantity=item["quantity"],
                branding_spec=item.get("branding_spec"),
            ))

    # 4. Load all assets
    asset_rows = _get("assets", {
        "select": "id, serial_number, asset_type, model_version, condition, status, home_hub_id, current_hub, current_venue_id, current_trip_id, weight_lbs, current_branding",
    })
    week_data.assets = [
        Asset(
            id=r["id"],
            serial_number=r["serial_number"],
            asset_type=r["asset_type"],
            model_version=r.get("model_version"),
            condition=r.get("condition", "good"),
            status=r.get("status", "at_hub"),
            home_hub_id=r["home_hub_id"],
            current_hub=r.get("current_hub"),
            current_venue_id=r.get("current_venue_id"),
            current_trip_id=r.get("current_trip_id"),
            weight_lbs=float(r["weight_lbs"]) if r.get("weight_lbs") else None,
            current_branding=r.get("current_branding"),
        )
        for r in asset_rows
    ]

    # 5. Load vehicles (available this week)
    vehicle_rows = _get("vehicles", {
        "status": "eq.active",
        "select": "id, name, type, home_hub_id, capacity_lbs, capacity_cuft, status",
    })
    # Check vehicle availability
    unavailable_vehicle_ids: set[str] = set()
    avail_rows = _get("vehicle_availability", {
        "season_year": f"eq.{season_year}",
        "week_number": f"eq.{week_number}",
        "is_available": "eq.false",
    })
    for ar in avail_rows:
        unavailable_vehicle_ids.add(ar["vehicle_id"])

    week_data.vehicles = [
        Vehicle(
            id=r["id"], name=r["name"], type=r.get("type"),
            home_hub_id=r["home_hub_id"],
            capacity_lbs=r.get("capacity_lbs"),
            capacity_cuft=r.get("capacity_cuft"),
            status=r["status"],
        )
        for r in vehicle_rows
        if r["id"] not in unavailable_vehicle_ids
    ]

    # 6. Load personnel (available this week)
    personnel_rows = _get("personnel", {
        "select": "id, name, role, home_hub_id, skills, max_drive_hrs",
    })
    # Check personnel availability
    unavailable_person_ids: set[str] = set()
    person_avail_rows = _get("personnel_availability", {
        "season_year": f"eq.{season_year}",
        "week_number": f"eq.{week_number}",
        "is_available": "eq.false",
    })
    for ar in person_avail_rows:
        unavailable_person_ids.add(ar["person_id"])

    week_data.personnel = [
        Person(
            id=r["id"], name=r["name"], role=r["role"],
            home_hub_id=r["home_hub_id"],
            skills=r.get("skills") or [],
            max_drive_hrs=r.get("max_drive_hrs", 11),
        )
        for r in personnel_rows
        if r["id"] not in unavailable_person_ids
    ]

    # 7. Load active branding tasks
    branding_rows = _get("branding_tasks", {
        "status": "neq.completed",
        "select": "id, asset_id, from_branding, to_branding, hub_id, needed_by_date, status",
    })
    week_data.branding_tasks = [
        BrandingTask(
            id=r["id"], asset_id=r["asset_id"],
            from_branding=r.get("from_branding"),
            to_branding=r.get("to_branding"),
            hub_id=r["hub_id"],
            needed_by_date=r.get("needed_by_date"),
            status=r["status"],
        )
        for r in branding_rows
    ]

    # 8. Load asset assignments for the season
    assignment_rows = _get("asset_assignments", {
        "season_year": f"eq.{season_year}",
        "select": "id, asset_id, customer_id, season_year, is_permanent",
    })
    week_data.asset_assignments = [
        AssetAssignment(
            id=r["id"], asset_id=r["asset_id"],
            customer_id=r["customer_id"],
            season_year=r["season_year"],
            is_permanent=r.get("is_permanent", False),
        )
        for r in assignment_rows
    ]

    return week_data


def load_next_week_schedule(
    season_year: int, week_number: int
) -> list[Game]:
    """
    Load next week's game schedule for lookahead disposition logic.
    Returns games for week_number + 1.
    """
    next_week = week_number + 1
    if next_week > 18:
        return []  # End of season

    game_rows = _get("game_schedule", {
        "season_year": f"eq.{season_year}",
        "week_number": f"eq.{next_week}",
        "select": "*, customers(id, name, sport_type), venues(id, customer_id, name, address, city, state, lat, lng, is_primary)",
    })

    games: list[Game] = []
    for r in game_rows:
        cust = r.get("customers") or {}
        ven_data = r.get("venues")
        venue = None
        if ven_data:
            venue = Venue(
                id=ven_data["id"],
                customer_id=ven_data.get("customer_id"),
                name=ven_data["name"],
                address=ven_data.get("address"),
                city=ven_data.get("city"),
                state=ven_data.get("state"),
                lat=float(ven_data["lat"]) if ven_data.get("lat") else None,
                lng=float(ven_data["lng"]) if ven_data.get("lng") else None,
                is_primary=ven_data.get("is_primary", False),
            )

        games.append(Game(
            id=r["id"],
            customer_id=r["customer_id"],
            customer_name=cust.get("name", ""),
            venue_id=r.get("venue_id"),
            venue=venue,
            season_year=r["season_year"],
            week_number=r["week_number"],
            game_date=r["game_date"],
            game_time=r.get("game_time"),
            opponent=r.get("opponent"),
            is_home_game=r.get("is_home_game", True),
            sidelines_served=r.get("sidelines_served", "both"),
            season_phase=r.get("season_phase", "regular"),
        ))

    return games


def _load_week0_data(season_year: int) -> WeekData:
    """
    Load Week 0 pre-season deployment data.

    Derives delivery targets from Week 1 games — no actual Week 0
    rows needed in game_schedule.  Game times are cleared (no time
    crunch) and season_phase is set to 'preseason'.
    """
    week_data = WeekData(season_year=season_year, week_number=0)

    # 1. Load hubs
    hub_rows = _get("hubs")
    week_data.hubs = [
        Hub(
            id=r["id"], name=r["name"], city=r["city"],
            state=r["state"], address=r["address"],
            lat=float(r["lat"]), lng=float(r["lng"]),
        )
        for r in hub_rows
    ]

    # 2. Load Week 1 games as delivery targets
    game_rows = _get("game_schedule", {
        "season_year": f"eq.{season_year}",
        "week_number": "eq.1",
        "select": "*, customers(id, name, sport_type), "
                  "venues(id, customer_id, name, address, city, "
                  "state, lat, lng, is_primary)",
    })

    customer_ids: set[str] = set()
    for r in game_rows:
        cust = r.get("customers") or {}
        ven_data = r.get("venues")
        venue = None
        if ven_data:
            venue = Venue(
                id=ven_data["id"],
                customer_id=ven_data.get("customer_id"),
                name=ven_data["name"],
                address=ven_data.get("address"),
                city=ven_data.get("city"),
                state=ven_data.get("state"),
                lat=float(ven_data["lat"]) if ven_data.get("lat") else None,
                lng=float(ven_data["lng"]) if ven_data.get("lng") else None,
                is_primary=ven_data.get("is_primary", False),
            )

        # Transform: keep venue but clear game_time (no time constraint)
        game = Game(
            id=r["id"],
            customer_id=r["customer_id"],
            customer_name=cust.get("name", ""),
            venue_id=r.get("venue_id"),
            venue=venue,
            season_year=r["season_year"],
            week_number=0,           # Mark as Week 0
            game_date=r["game_date"],
            game_time=None,          # No time constraint for pre-season
            opponent=r.get("opponent"),
            is_home_game=r.get("is_home_game", True),
            sidelines_served=r.get("sidelines_served", "both"),
            season_phase="preseason",
        )
        week_data.games.append(game)
        customer_ids.add(r["customer_id"])

    if not customer_ids:
        return week_data

    # 3. Load contract items for customers with games
    customer_filter = ",".join(customer_ids)
    contract_rows = _get("contracts", {
        "customer_id": f"in.({customer_filter})",
        "status": "eq.active",
        "select": "id, customer_id, customers(name), "
                  "contract_items(id, asset_type, model_version, "
                  "quantity, branding_spec)",
    })

    for cr in contract_rows:
        cust_name = (cr.get("customers") or {}).get("name", "")
        items = cr.get("contract_items") or []
        for item in items:
            week_data.contract_items.append(ContractItem(
                id=item["id"],
                contract_id=cr["id"],
                customer_id=cr["customer_id"],
                customer_name=cust_name,
                asset_type=item["asset_type"],
                model_version=item.get("model_version"),
                quantity=item["quantity"],
                branding_spec=item.get("branding_spec"),
            ))

    # 4. Load all assets
    asset_rows = _get("assets", {
        "select": "id, serial_number, asset_type, model_version, "
                  "condition, status, home_hub_id, current_hub, "
                  "current_venue_id, current_trip_id, weight_lbs, "
                  "current_branding",
    })
    week_data.assets = [
        Asset(
            id=r["id"],
            serial_number=r["serial_number"],
            asset_type=r["asset_type"],
            model_version=r.get("model_version"),
            condition=r.get("condition", "good"),
            status=r.get("status", "at_hub"),
            home_hub_id=r["home_hub_id"],
            current_hub=r.get("current_hub"),
            current_venue_id=r.get("current_venue_id"),
            current_trip_id=r.get("current_trip_id"),
            weight_lbs=float(r["weight_lbs"]) if r.get("weight_lbs") else None,
            current_branding=r.get("current_branding"),
        )
        for r in asset_rows
    ]

    # 5. Load all vehicles (no availability filtering for Week 0)
    vehicle_rows = _get("vehicles", {
        "status": "eq.active",
        "select": "id, name, type, home_hub_id, capacity_lbs, "
                  "capacity_cuft, status",
    })
    week_data.vehicles = [
        Vehicle(
            id=r["id"], name=r["name"], type=r.get("type"),
            home_hub_id=r["home_hub_id"],
            capacity_lbs=r.get("capacity_lbs"),
            capacity_cuft=r.get("capacity_cuft"),
            status=r["status"],
        )
        for r in vehicle_rows
    ]

    # 6. Load all personnel (no availability filtering for Week 0)
    personnel_rows = _get("personnel", {
        "select": "id, name, role, home_hub_id, skills, max_drive_hrs",
    })
    week_data.personnel = [
        Person(
            id=r["id"], name=r["name"], role=r["role"],
            home_hub_id=r["home_hub_id"],
            skills=r.get("skills") or [],
            max_drive_hrs=r.get("max_drive_hrs", 11),
        )
        for r in personnel_rows
    ]

    # 7. Load active branding tasks
    branding_rows = _get("branding_tasks", {
        "status": "neq.completed",
        "select": "id, asset_id, from_branding, to_branding, "
                  "hub_id, needed_by_date, status",
    })
    week_data.branding_tasks = [
        BrandingTask(
            id=r["id"], asset_id=r["asset_id"],
            from_branding=r.get("from_branding"),
            to_branding=r.get("to_branding"),
            hub_id=r["hub_id"],
            needed_by_date=r.get("needed_by_date"),
            status=r["status"],
        )
        for r in branding_rows
    ]

    # 8. Load asset assignments for the season
    assignment_rows = _get("asset_assignments", {
        "season_year": f"eq.{season_year}",
        "select": "id, asset_id, customer_id, season_year, is_permanent",
    })
    week_data.asset_assignments = [
        AssetAssignment(
            id=r["id"], asset_id=r["asset_id"],
            customer_id=r["customer_id"],
            season_year=r["season_year"],
            is_permanent=r.get("is_permanent", False),
        )
        for r in assignment_rows
    ]

    return week_data
