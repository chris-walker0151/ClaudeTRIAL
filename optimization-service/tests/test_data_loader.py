"""Tests for the data loader module."""

from solver.data_loader import Hub, LatLng, Venue, WeekData


class TestLatLng:
    def test_equality(self):
        a = LatLng(41.4993, -81.6944)
        b = LatLng(41.4993, -81.6944)
        assert a == b

    def test_hash(self):
        a = LatLng(41.4993, -81.6944)
        b = LatLng(41.4993, -81.6944)
        assert hash(a) == hash(b)

    def test_inequality(self):
        a = LatLng(41.4993, -81.6944)
        b = LatLng(40.0, -80.0)
        assert a != b


class TestWeekData:
    def test_loads_from_fixture(self, single_stop_data):
        wd = single_stop_data
        assert wd.season_year == 2025
        assert wd.week_number == 1
        assert len(wd.hubs) == 1
        assert len(wd.games) == 1
        assert len(wd.assets) == 16
        assert len(wd.vehicles) == 1
        assert len(wd.personnel) == 2

    def test_game_venues(self, single_stop_data):
        venues = single_stop_data.game_venues
        assert len(venues) == 1
        assert venues[0].name == "Huntington Bank Field"

    def test_hub_locations(self, single_stop_data):
        locs = single_stop_data.hub_locations
        assert len(locs) == 1
        assert abs(locs[0].lat - 41.4993) < 0.001

    def test_get_all_locations(self, single_stop_data):
        locs = single_stop_data.get_all_locations()
        assert len(locs) == 2  # 1 hub + 1 venue

    def test_demands_for_game(self, single_stop_data):
        game = single_stop_data.games[0]
        demands = single_stop_data.demands_for_game(game)
        assert len(demands) == 2  # hybrid_bench + heated_foot_deck
        total_qty = sum(d.quantity for d in demands)
        assert total_qty == 16  # 8 benches + 8 foot decks

    def test_assets_at_hub(self, single_stop_data):
        hub_id = single_stop_data.hubs[0].id
        assets = single_stop_data.assets_at_hub(hub_id)
        assert len(assets) == 16

    def test_available_vehicles(self, single_stop_data):
        hub_id = single_stop_data.hubs[0].id
        vehicles = single_stop_data.available_vehicles_at_hub(hub_id)
        assert len(vehicles) == 1

    def test_nearest_hub(self, single_stop_data):
        venue = single_stop_data.game_venues[0]
        hub = single_stop_data.nearest_hub(venue)
        assert hub is not None
        assert hub.name == "Cleveland"

    def test_multi_stop_venues(self, multi_stop_data):
        venues = multi_stop_data.game_venues
        assert len(venues) == 3

    def test_multi_stop_demands(self, multi_stop_data):
        total_items = len(multi_stop_data.contract_items)
        assert total_items == 9  # 3 types × 3 customers
