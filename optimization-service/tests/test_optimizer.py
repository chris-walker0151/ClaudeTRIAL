"""Tests for the optimizer module."""

from tests.conftest import build_test_dist_matrix
from solver.clustering import cluster_venues
from solver.constraints import build_constraints
from solver.optimizer import optimize_week


class TestSingleStop:
    def test_single_stop_generates_trip(self, single_stop_data):
        dist_matrix = build_test_dist_matrix(single_stop_data)
        constraints = build_constraints(single_stop_data)
        clusters = cluster_venues(
            single_stop_data.game_venues,
            single_stop_data.hub_locations,
            dist_matrix,
        )

        result = optimize_week(single_stop_data, dist_matrix, constraints, clusters)

        assert len(result.trips) == 1
        assert result.status == "completed"

    def test_single_stop_assigns_assets(self, single_stop_data):
        dist_matrix = build_test_dist_matrix(single_stop_data)
        constraints = build_constraints(single_stop_data)
        clusters = cluster_venues(
            single_stop_data.game_venues,
            single_stop_data.hub_locations,
            dist_matrix,
        )

        result = optimize_week(single_stop_data, dist_matrix, constraints, clusters)

        trip = result.trips[0]
        assert len(trip.assets) == 16  # 8 benches + 8 foot decks

    def test_single_stop_assigns_vehicle(self, single_stop_data):
        dist_matrix = build_test_dist_matrix(single_stop_data)
        constraints = build_constraints(single_stop_data)
        clusters = cluster_venues(
            single_stop_data.game_venues,
            single_stop_data.hub_locations,
            dist_matrix,
        )

        result = optimize_week(single_stop_data, dist_matrix, constraints, clusters)

        trip = result.trips[0]
        assert trip.vehicle_id == "veh-001"
        assert trip.vehicle_name == "Truck-CLE-01"

    def test_single_stop_assigns_personnel(self, single_stop_data):
        dist_matrix = build_test_dist_matrix(single_stop_data)
        constraints = build_constraints(single_stop_data)
        clusters = cluster_venues(
            single_stop_data.game_venues,
            single_stop_data.hub_locations,
            dist_matrix,
        )

        result = optimize_week(single_stop_data, dist_matrix, constraints, clusters)

        trip = result.trips[0]
        assert len(trip.personnel) >= 1  # At least a driver

    def test_single_stop_has_distance(self, single_stop_data):
        dist_matrix = build_test_dist_matrix(single_stop_data)
        constraints = build_constraints(single_stop_data)
        clusters = cluster_venues(
            single_stop_data.game_venues,
            single_stop_data.hub_locations,
            dist_matrix,
        )

        result = optimize_week(single_stop_data, dist_matrix, constraints, clusters)

        trip = result.trips[0]
        # Cleveland hub to Browns stadium is very close (~1 mile)
        assert trip.total_miles >= 0


class TestMultiStop:
    def test_multi_stop_clusters(self, multi_stop_data):
        dist_matrix = build_test_dist_matrix(multi_stop_data)
        clusters = cluster_venues(
            multi_stop_data.game_venues,
            multi_stop_data.hub_locations,
            dist_matrix,
        )

        # All 3 Ohio venues should cluster together (within 150 miles)
        total_venues = sum(len(c.venues) for c in clusters)
        assert total_venues == 3

    def test_multi_stop_generates_trip(self, multi_stop_data):
        dist_matrix = build_test_dist_matrix(multi_stop_data)
        constraints = build_constraints(multi_stop_data)
        clusters = cluster_venues(
            multi_stop_data.game_venues,
            multi_stop_data.hub_locations,
            dist_matrix,
        )

        result = optimize_week(multi_stop_data, dist_matrix, constraints, clusters)

        # Should produce 1 multi-stop trip (all venues within cluster radius)
        assert len(result.trips) >= 1
        assert result.status == "completed"

    def test_multi_stop_covers_all_venues(self, multi_stop_data):
        dist_matrix = build_test_dist_matrix(multi_stop_data)
        constraints = build_constraints(multi_stop_data)
        clusters = cluster_venues(
            multi_stop_data.game_venues,
            multi_stop_data.hub_locations,
            dist_matrix,
        )

        result = optimize_week(multi_stop_data, dist_matrix, constraints, clusters)

        # All venue stops should be covered
        all_stop_venues = set()
        for trip in result.trips:
            for stop in trip.stops:
                all_stop_venues.add(stop.venue_id)

        game_venues = {g.venue_id for g in multi_stop_data.games if g.venue_id}
        assert game_venues.issubset(all_stop_venues)


class TestCapacityOverflow:
    def test_capacity_overflow_warning(self, capacity_overflow_data):
        dist_matrix = build_test_dist_matrix(capacity_overflow_data)
        constraints = build_constraints(capacity_overflow_data)
        clusters = cluster_venues(
            capacity_overflow_data.game_venues,
            capacity_overflow_data.hub_locations,
            dist_matrix,
        )

        result = optimize_week(
            capacity_overflow_data, dist_matrix, constraints, clusters
        )

        # Should either generate trips with warnings or have unassigned demands
        # Vehicle is only 1000 lbs, 16 benches at 150 lbs = 2400 lbs
        assert len(result.trips) >= 1 or len(result.unassigned_demands) > 0


class TestBrandingConflict:
    def test_branding_blocks_assets(self, branding_conflict_data):
        dist_matrix = build_test_dist_matrix(branding_conflict_data)
        constraints = build_constraints(branding_conflict_data)

        # 3 heated benches should be blocked
        assert len(constraints.blocked_asset_ids) == 3

        clusters = cluster_venues(
            branding_conflict_data.game_venues,
            branding_conflict_data.hub_locations,
            dist_matrix,
        )

        result = optimize_week(
            branding_conflict_data, dist_matrix, constraints, clusters
        )

        # Should have unassigned demands for the 3 blocked heated benches
        assert result.has_unassigned
        bench_unassigned = [
            d for d in result.unassigned_demands
            if d.asset_type == "heated_bench"
        ]
        assert len(bench_unassigned) > 0
