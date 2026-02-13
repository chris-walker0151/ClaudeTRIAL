"""
Distance matrix module — cached distance lookups via Google Maps API.

Strategy:
1. Check distance_cache table for existing entries
2. For cache misses, batch-call Google Maps Distance Matrix API
3. Store new results in distance_cache table
4. Rate limit API calls (200ms delay between batches)
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass

import httpx
import googlemaps

import config
from solver.data_loader import LatLng


@dataclass
class DistanceEntry:
    """Distance and duration between two points."""
    distance_miles: float
    duration_minutes: float


class DistanceMatrix:
    """
    NxN distance/duration matrix for a list of locations.

    Access via matrix.get(i, j) where i and j are location indices.
    """

    def __init__(self, locations: list[LatLng]) -> None:
        self.locations = locations
        self._n = len(locations)
        # Initialize with zeros on diagonal, None elsewhere
        self._data: list[list[DistanceEntry | None]] = [
            [
                DistanceEntry(0.0, 0.0) if i == j else None
                for j in range(self._n)
            ]
            for i in range(self._n)
        ]

    def get(self, i: int, j: int) -> DistanceEntry:
        """Get distance/duration between locations i and j."""
        entry = self._data[i][j]
        if entry is None:
            # Fallback: estimate using haversine
            return self._haversine_estimate(
                self.locations[i], self.locations[j]
            )
        return entry

    def set(self, i: int, j: int, entry: DistanceEntry) -> None:
        """Set distance/duration between locations i and j."""
        self._data[i][j] = entry

    @property
    def size(self) -> int:
        return self._n

    def distance_miles(self, i: int, j: int) -> float:
        """Get distance in miles between locations i and j."""
        return self.get(i, j).distance_miles

    def duration_minutes(self, i: int, j: int) -> float:
        """Get duration in minutes between locations i and j."""
        return self.get(i, j).duration_minutes

    @staticmethod
    def _haversine_estimate(a: LatLng, b: LatLng) -> DistanceEntry:
        """Estimate distance/duration using haversine formula."""
        R = 3959  # Earth radius in miles
        lat1, lat2 = math.radians(a.lat), math.radians(b.lat)
        dlat = math.radians(b.lat - a.lat)
        dlng = math.radians(b.lng - a.lng)
        h = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
        )
        distance = 2 * R * math.asin(math.sqrt(h))
        # Estimate: road distance ~1.3x straight line, 50 mph average
        road_distance = distance * 1.3
        duration = (road_distance / 50) * 60  # minutes
        return DistanceEntry(
            distance_miles=round(road_distance, 1),
            duration_minutes=round(duration, 1),
        )

    def location_index(self, location: LatLng) -> int | None:
        """Find the index of a location in the matrix."""
        for i, loc in enumerate(self.locations):
            if loc == location:
                return i
        return None


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


def _check_cache(
    locations: list[LatLng], tolerance: float = config.DISTANCE_CACHE_TOLERANCE,
) -> dict[tuple[int, int], DistanceEntry]:
    """
    Check distance_cache table for cached entries.
    Returns dict mapping (i, j) pairs to cached distances.
    """
    if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_KEY:
        return {}

    cached: dict[tuple[int, int], DistanceEntry] = {}

    try:
        response = httpx.get(
            _supabase_url("distance_cache"),
            headers=_supabase_headers(),
            params={"select": "origin_lat,origin_lng,dest_lat,dest_lng,distance_miles,duration_minutes"},
            timeout=15.0,
        )
        response.raise_for_status()
        rows = response.json()
    except Exception:
        return {}

    # Build lookup from cache rows
    for row in rows:
        o_lat = float(row["origin_lat"])
        o_lng = float(row["origin_lng"])
        d_lat = float(row["dest_lat"])
        d_lng = float(row["dest_lng"])

        # Match against our locations
        for i, loc_a in enumerate(locations):
            if abs(loc_a.lat - o_lat) > tolerance or abs(loc_a.lng - o_lng) > tolerance:
                continue
            for j, loc_b in enumerate(locations):
                if i == j:
                    continue
                if abs(loc_b.lat - d_lat) > tolerance or abs(loc_b.lng - d_lng) > tolerance:
                    continue
                cached[(i, j)] = DistanceEntry(
                    distance_miles=float(row["distance_miles"]) if row.get("distance_miles") else 0,
                    duration_minutes=float(row["duration_minutes"]) if row.get("duration_minutes") else 0,
                )

    return cached


def _store_cache(entries: list[dict]) -> None:
    """Store new distance entries in the cache table."""
    if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_KEY or not entries:
        return

    try:
        httpx.post(
            _supabase_url("distance_cache"),
            headers=_supabase_headers(),
            json=entries,
            timeout=30.0,
        )
    except Exception:
        pass  # Cache write failures are non-fatal


def _fetch_from_google_maps(
    origins: list[LatLng],
    destinations: list[LatLng],
) -> list[dict]:
    """
    Call Google Maps Distance Matrix API for uncached pairs.
    Returns list of {origin_idx, dest_idx, distance_miles, duration_minutes} dicts.
    """
    if not config.GOOGLE_MAPS_API_KEY:
        return []

    gmaps = googlemaps.Client(key=config.GOOGLE_MAPS_API_KEY)
    results: list[dict] = []

    # Batch in groups of BATCH_SIZE (API limit: 25 origins × 25 destinations)
    batch_size = config.BATCH_SIZE
    for o_start in range(0, len(origins), batch_size):
        o_batch = origins[o_start : o_start + batch_size]
        for d_start in range(0, len(destinations), batch_size):
            d_batch = destinations[d_start : d_start + batch_size]

            try:
                api_result = gmaps.distance_matrix(
                    origins=[(loc.lat, loc.lng) for loc in o_batch],
                    destinations=[(loc.lat, loc.lng) for loc in d_batch],
                    units="imperial",
                    mode="driving",
                )

                for i, row in enumerate(api_result.get("rows", [])):
                    for j, element in enumerate(row.get("elements", [])):
                        if element.get("status") != "OK":
                            continue

                        dist_m = element["distance"]["value"]
                        dur_s = element["duration"]["value"]
                        dist_miles = dist_m / 1609.34
                        dur_min = dur_s / 60

                        results.append({
                            "origin": o_batch[i],
                            "destination": d_batch[j],
                            "distance_miles": round(dist_miles, 1),
                            "duration_minutes": round(dur_min, 1),
                        })

                # Rate limit
                time.sleep(config.GOOGLE_MAPS_RATE_LIMIT_MS / 1000)

            except Exception:
                continue  # Skip failed batches, use haversine fallback

    return results


def get_distance_matrix(locations: list[LatLng]) -> DistanceMatrix:
    """
    Build a complete NxN distance matrix for the given locations.

    Strategy:
    1. Check distance_cache table for existing entries
    2. Identify missing pairs
    3. Fetch missing pairs from Google Maps API
    4. Store new results in cache
    5. Fill remaining gaps with haversine estimates
    """
    matrix = DistanceMatrix(locations)
    n = len(locations)

    if n <= 1:
        return matrix

    # Step 1: Check cache
    cached = _check_cache(locations)
    for (i, j), entry in cached.items():
        matrix.set(i, j, entry)

    # Step 2: Identify missing pairs
    missing_pairs: list[tuple[int, int]] = []
    for i in range(n):
        for j in range(n):
            if i != j and matrix._data[i][j] is None:
                missing_pairs.append((i, j))

    if not missing_pairs:
        return matrix

    # Step 3: Fetch from Google Maps for unique origin/dest locations
    missing_origins_idx = sorted({p[0] for p in missing_pairs})
    missing_dests_idx = sorted({p[1] for p in missing_pairs})
    missing_origins = [locations[i] for i in missing_origins_idx]
    missing_dests = [locations[j] for j in missing_dests_idx]

    api_results = _fetch_from_google_maps(missing_origins, missing_dests)

    # Step 4: Store in cache and matrix
    cache_entries: list[dict] = []
    for result in api_results:
        origin_loc: LatLng = result["origin"]
        dest_loc: LatLng = result["destination"]

        # Find matrix indices
        i = matrix.location_index(origin_loc)
        j = matrix.location_index(dest_loc)
        if i is not None and j is not None:
            entry = DistanceEntry(
                distance_miles=result["distance_miles"],
                duration_minutes=result["duration_minutes"],
            )
            matrix.set(i, j, entry)

            cache_entries.append({
                "origin_lat": origin_loc.lat,
                "origin_lng": origin_loc.lng,
                "dest_lat": dest_loc.lat,
                "dest_lng": dest_loc.lng,
                "distance_miles": result["distance_miles"],
                "duration_minutes": result["duration_minutes"],
            })

    _store_cache(cache_entries)

    # Step 5: Fill remaining with haversine estimates
    for i in range(n):
        for j in range(n):
            if i != j and matrix._data[i][j] is None:
                estimate = DistanceMatrix._haversine_estimate(
                    locations[i], locations[j]
                )
                matrix.set(i, j, estimate)

    return matrix
