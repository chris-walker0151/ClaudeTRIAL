"""Tests for the constraints module."""

from solver.constraints import (
    build_constraints, check_branding, check_capacity, check_capacity_weight,
    check_drive_time, match_asset_to_demand,
)
from solver.data_loader import Asset, BrandingTask, ContractItem, Vehicle


class TestBuildConstraints:
    def test_builds_demands(self, single_stop_data):
        constraints = build_constraints(single_stop_data)
        assert len(constraints.demands) == 1
        demand = constraints.demands[0]
        assert demand.customer_name == "Cleveland Browns"
        assert demand.total_quantity == 16
        assert demand.total_weight_lbs > 0

    def test_time_windows(self, single_stop_data):
        constraints = build_constraints(single_stop_data)
        # Should have a time window for the Browns venue
        assert len(constraints.time_windows) >= 1

    def test_blocked_assets(self, branding_conflict_data):
        constraints = build_constraints(branding_conflict_data)
        # 3 heated benches have pending branding tasks
        assert len(constraints.blocked_asset_ids) == 3

    def test_multi_stop_demands(self, multi_stop_data):
        constraints = build_constraints(multi_stop_data)
        assert len(constraints.demands) == 3  # 3 venues


class TestCheckCapacity:
    def test_within_capacity(self):
        vehicle = Vehicle(
            id="v1", name="Truck", type="truck",
            home_hub_id="h1", capacity_lbs=10000,
            capacity_cuft=800, status="active",
        )
        assets = [
            Asset(id=f"a{i}", serial_number=f"SN{i}", asset_type="heated_bench",
                  model_version=None, condition="good", status="at_hub",
                  home_hub_id="h1", current_hub="h1", current_venue_id=None,
                  current_trip_id=None, weight_lbs=150, current_branding=None)
            for i in range(10)  # 10 × 150 = 1500 lbs
        ]
        assert check_capacity(vehicle, assets) is True

    def test_over_capacity(self):
        vehicle = Vehicle(
            id="v1", name="Van", type="van",
            home_hub_id="h1", capacity_lbs=1000,
            capacity_cuft=200, status="active",
        )
        assets = [
            Asset(id=f"a{i}", serial_number=f"SN{i}", asset_type="heated_bench",
                  model_version=None, condition="good", status="at_hub",
                  home_hub_id="h1", current_hub="h1", current_venue_id=None,
                  current_trip_id=None, weight_lbs=150, current_branding=None)
            for i in range(8)  # 8 × 150 = 1200 lbs > 1000
        ]
        assert check_capacity(vehicle, assets) is False

    def test_no_capacity_limit(self):
        vehicle = Vehicle(
            id="v1", name="Truck", type="truck",
            home_hub_id="h1", capacity_lbs=None,
            capacity_cuft=None, status="active",
        )
        assert check_capacity_weight(vehicle, 99999) is True


class TestCheckBranding:
    def test_matching_branding(self):
        asset = Asset(
            id="a1", serial_number="SN1", asset_type="heated_bench",
            model_version=None, condition="good", status="at_hub",
            home_hub_id="h1", current_hub="h1", current_venue_id=None,
            current_trip_id=None, weight_lbs=150,
            current_branding="Cleveland Browns",
        )
        assert check_branding(asset, "Cleveland Browns", "Cleveland Browns", []) is True

    def test_mismatched_branding(self):
        asset = Asset(
            id="a1", serial_number="SN1", asset_type="heated_bench",
            model_version=None, condition="good", status="at_hub",
            home_hub_id="h1", current_hub="h1", current_venue_id=None,
            current_trip_id=None, weight_lbs=150,
            current_branding="Penn State",
        )
        assert check_branding(asset, "Ohio State", "Ohio State", []) is False

    def test_no_branding_required(self):
        asset = Asset(
            id="a1", serial_number="SN1", asset_type="heated_bench",
            model_version=None, condition="good", status="at_hub",
            home_hub_id="h1", current_hub="h1", current_venue_id=None,
            current_trip_id=None, weight_lbs=150,
            current_branding="Anything",
        )
        assert check_branding(asset, "Team", None, []) is True

    def test_unbranded_asset_matches_anything(self):
        asset = Asset(
            id="a1", serial_number="SN1", asset_type="heated_bench",
            model_version=None, condition="good", status="at_hub",
            home_hub_id="h1", current_hub="h1", current_venue_id=None,
            current_trip_id=None, weight_lbs=150,
            current_branding=None,
        )
        assert check_branding(asset, "Any Team", "Any Team", []) is True


class TestCheckDriveTime:
    def test_within_limits(self):
        assert check_drive_time(600, 11) is True  # 10 hours

    def test_at_limit(self):
        assert check_drive_time(660, 11) is True  # exactly 11 hours

    def test_over_limit(self):
        assert check_drive_time(720, 11) is False  # 12 hours


class TestMatchAssetToDemand:
    def test_matching_asset(self):
        asset = Asset(
            id="a1", serial_number="SN1", asset_type="heated_bench",
            model_version=None, condition="good", status="at_hub",
            home_hub_id="h1", current_hub="h1", current_venue_id=None,
            current_trip_id=None, weight_lbs=150, current_branding=None,
        )
        item = ContractItem(
            id="ci1", contract_id="c1", customer_id="cu1",
            customer_name="Team", asset_type="heated_bench",
            model_version=None, quantity=1, branding_spec=None,
        )
        assert match_asset_to_demand(asset, item, set(), []) is True

    def test_wrong_type(self):
        asset = Asset(
            id="a1", serial_number="SN1", asset_type="dragon_shader",
            model_version=None, condition="good", status="at_hub",
            home_hub_id="h1", current_hub="h1", current_venue_id=None,
            current_trip_id=None, weight_lbs=200, current_branding=None,
        )
        item = ContractItem(
            id="ci1", contract_id="c1", customer_id="cu1",
            customer_name="Team", asset_type="heated_bench",
            model_version=None, quantity=1, branding_spec=None,
        )
        assert match_asset_to_demand(asset, item, set(), []) is False

    def test_blocked_asset(self):
        asset = Asset(
            id="a1", serial_number="SN1", asset_type="heated_bench",
            model_version=None, condition="good", status="at_hub",
            home_hub_id="h1", current_hub="h1", current_venue_id=None,
            current_trip_id=None, weight_lbs=150, current_branding=None,
        )
        item = ContractItem(
            id="ci1", contract_id="c1", customer_id="cu1",
            customer_name="Team", asset_type="heated_bench",
            model_version=None, quantity=1, branding_spec=None,
        )
        assert match_asset_to_demand(asset, item, {"a1"}, []) is False

    def test_out_of_service(self):
        asset = Asset(
            id="a1", serial_number="SN1", asset_type="heated_bench",
            model_version=None, condition="out_of_service", status="at_hub",
            home_hub_id="h1", current_hub="h1", current_venue_id=None,
            current_trip_id=None, weight_lbs=150, current_branding=None,
        )
        item = ContractItem(
            id="ci1", contract_id="c1", customer_id="cu1",
            customer_name="Team", asset_type="heated_bench",
            model_version=None, quantity=1, branding_spec=None,
        )
        assert match_asset_to_demand(asset, item, set(), []) is False
