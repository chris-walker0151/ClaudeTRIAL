"""Tests for the distance matrix module."""

import math

from solver.data_loader import LatLng
from solver.distance_matrix import DistanceEntry, DistanceMatrix


class TestDistanceMatrix:
    def test_create_empty(self):
        locs = [
            LatLng(41.4993, -81.6944, "Cleveland Hub"),
            LatLng(41.5061, -81.6995, "Browns Stadium"),
        ]
        matrix = DistanceMatrix(locs)
        assert matrix.size == 2
        # Diagonal should be zero
        assert matrix.distance_miles(0, 0) == 0.0
        assert matrix.distance_miles(1, 1) == 0.0

    def test_set_and_get(self):
        locs = [
            LatLng(41.4993, -81.6944, "A"),
            LatLng(41.5061, -81.6995, "B"),
        ]
        matrix = DistanceMatrix(locs)
        entry = DistanceEntry(distance_miles=5.2, duration_minutes=12.0)
        matrix.set(0, 1, entry)

        result = matrix.get(0, 1)
        assert result.distance_miles == 5.2
        assert result.duration_minutes == 12.0

    def test_haversine_estimate(self):
        # Cleveland to Akron is ~35 miles straight line
        cle = LatLng(41.4993, -81.6944)
        akron = LatLng(41.0753, -81.5097)
        estimate = DistanceMatrix._haversine_estimate(cle, akron)
        # Road estimate should be ~40-60 miles (1.3x straight line)
        assert 30 < estimate.distance_miles < 80
        assert estimate.duration_minutes > 0

    def test_haversine_same_point(self):
        loc = LatLng(41.4993, -81.6944)
        estimate = DistanceMatrix._haversine_estimate(loc, loc)
        assert estimate.distance_miles == 0.0
        assert estimate.duration_minutes == 0.0

    def test_location_index(self):
        locs = [
            LatLng(41.4993, -81.6944, "A"),
            LatLng(41.5061, -81.6995, "B"),
            LatLng(41.0753, -81.5097, "C"),
        ]
        matrix = DistanceMatrix(locs)
        assert matrix.location_index(LatLng(41.5061, -81.6995)) == 1
        assert matrix.location_index(LatLng(0.0, 0.0)) is None

    def test_fallback_on_missing(self):
        """Unset entries should use haversine fallback."""
        locs = [
            LatLng(41.4993, -81.6944, "Cleveland"),
            LatLng(41.0753, -81.5097, "Akron"),
        ]
        matrix = DistanceMatrix(locs)
        # Don't set (0,1) — should fall back to haversine
        result = matrix.get(0, 1)
        assert result.distance_miles > 0
        assert result.duration_minutes > 0
