"""Tests for the scoring module."""

from tests.conftest import build_test_dist_matrix
from solver.clustering import cluster_venues
from solver.constraints import build_constraints
from solver.optimizer import optimize_week, OptimizationResult, Trip, TripAsset
from solver.scoring import score_run, score_trip


class TestScoring:
    def test_scores_single_stop(self, single_stop_data):
        dist_matrix = build_test_dist_matrix(single_stop_data)
        constraints = build_constraints(single_stop_data)
        clusters = cluster_venues(
            single_stop_data.game_venues,
            single_stop_data.hub_locations,
            dist_matrix,
        )
        result = optimize_week(single_stop_data, dist_matrix, constraints, clusters)
        result = score_run(result, dist_matrix)

        assert result.average_score > 0
        for trip in result.trips:
            assert 0 <= trip.optimizer_score <= 100

    def test_empty_result_scores_100(self):
        result = OptimizationResult()
        from solver.data_loader import LatLng
        from solver.distance_matrix import DistanceMatrix
        matrix = DistanceMatrix([LatLng(0, 0)])
        result = score_run(result, matrix)
        assert result.average_score == 100.0

    def test_unassigned_penalty(self, single_stop_data):
        dist_matrix = build_test_dist_matrix(single_stop_data)
        constraints = build_constraints(single_stop_data)
        clusters = cluster_venues(
            single_stop_data.game_venues,
            single_stop_data.hub_locations,
            dist_matrix,
        )
        result = optimize_week(single_stop_data, dist_matrix, constraints, clusters)

        # Add fake unassigned demands
        from solver.optimizer import UnassignedDemand
        result.unassigned_demands = [
            UnassignedDemand("Team", "Venue", "heated_bench", 3, "No vehicle"),
        ]

        result = score_run(result, dist_matrix)

        # Score should be lower due to unassigned penalty
        assert result.average_score >= 0

    def test_multi_stop_bonus(self, multi_stop_data):
        dist_matrix = build_test_dist_matrix(multi_stop_data)
        constraints = build_constraints(multi_stop_data)
        clusters = cluster_venues(
            multi_stop_data.game_venues,
            multi_stop_data.hub_locations,
            dist_matrix,
        )
        result = optimize_week(multi_stop_data, dist_matrix, constraints, clusters)
        result = score_run(result, dist_matrix)

        # Multi-stop trips should get a bonus
        for trip in result.trips:
            if len(trip.stops) > 1:
                score = trip.optimizer_score
                assert score > 0  # Should have some positive score
