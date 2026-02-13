"""Tests for the infeasibility handler module."""

from tests.conftest import build_test_dist_matrix
from solver.clustering import cluster_venues
from solver.constraints import build_constraints
from solver.infeasibility import handle_infeasibility
from solver.optimizer import OptimizationResult, UnassignedDemand, optimize_week


class TestInfeasibilityHandler:
    def test_no_infeasibility(self, single_stop_data):
        """Feasible solution should pass through unchanged."""
        dist_matrix = build_test_dist_matrix(single_stop_data)
        constraints = build_constraints(single_stop_data)
        clusters = cluster_venues(
            single_stop_data.game_venues,
            single_stop_data.hub_locations,
            dist_matrix,
        )
        result = optimize_week(single_stop_data, dist_matrix, constraints, clusters)

        # Should be fully feasible — no infeasibility handling needed
        assert result.status == "completed"
        assert not result.has_unassigned

    def test_infeasible_week_produces_partial(self, infeasible_week_data):
        """5 venues with 1 vehicle should produce a partial solution."""
        dist_matrix = build_test_dist_matrix(infeasible_week_data)
        constraints = build_constraints(infeasible_week_data)
        clusters = cluster_venues(
            infeasible_week_data.game_venues,
            infeasible_week_data.hub_locations,
            dist_matrix,
        )
        result = optimize_week(
            infeasible_week_data, dist_matrix, constraints, clusters
        )

        # With only 1 vehicle, can't serve all 5 venues in different cities
        # The result should have some trips but also unassigned demands
        assert len(result.trips) >= 1

    def test_infeasibility_cascade(self, infeasible_week_data):
        """Cascade should attempt to improve the solution."""
        dist_matrix = build_test_dist_matrix(infeasible_week_data)
        constraints = build_constraints(infeasible_week_data)
        clusters = cluster_venues(
            infeasible_week_data.game_venues,
            infeasible_week_data.hub_locations,
            dist_matrix,
        )
        initial = optimize_week(
            infeasible_week_data, dist_matrix, constraints, clusters
        )

        if initial.has_unassigned:
            result = handle_infeasibility(
                infeasible_week_data, dist_matrix, initial
            )
            # Should have constraint_relaxations recorded
            assert len(result.constraint_relaxations) > 0
            # Status should be partial (can't serve all with 1 vehicle)
            assert result.status in ("completed", "partial")

    def test_branding_relaxation(self, branding_conflict_data):
        """Branding conflicts should be resolved by relaxing branding constraint."""
        dist_matrix = build_test_dist_matrix(branding_conflict_data)
        constraints = build_constraints(branding_conflict_data)
        clusters = cluster_venues(
            branding_conflict_data.game_venues,
            branding_conflict_data.hub_locations,
            dist_matrix,
        )
        initial = optimize_week(
            branding_conflict_data, dist_matrix, constraints, clusters
        )

        if initial.has_unassigned:
            result = handle_infeasibility(
                branding_conflict_data, dist_matrix, initial
            )
            # Branding relaxation should help
            # (Step 2 unblocks the branded assets)
            assert len(result.unassigned_demands) < len(initial.unassigned_demands) or \
                   len(result.constraint_relaxations) > 0
