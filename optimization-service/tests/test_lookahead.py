"""Tests for the lookahead module."""

from solver.data_loader import Game, Venue
from solver.lookahead import Disposition, determine_disposition
from solver.optimizer import Trip, TripStop
from solver.constraints import Demand


def _make_game(
    customer_id: str, venue_id: str, venue_name: str,
    lat: float = 41.5, lng: float = -81.7,
    week: int = 2,
) -> Game:
    """Helper to create a test Game."""
    return Game(
        id=f"g-{venue_id}",
        customer_id=customer_id,
        customer_name=f"Customer {customer_id}",
        venue_id=venue_id,
        venue=Venue(
            id=venue_id, customer_id=customer_id, name=venue_name,
            address=None, city=None, state=None,
            lat=lat, lng=lng, is_primary=True,
        ),
        season_year=2025,
        week_number=week,
        game_date="2025-09-14",
        game_time="13:00",
        opponent="Rival",
        is_home_game=True,
        sidelines_served="both",
        season_phase="regular",
    )


def _make_stop(venue_id: str, venue_name: str) -> TripStop:
    """Helper to create a test TripStop."""
    return TripStop(
        venue_id=venue_id,
        venue_name=venue_name,
        stop_order=1,
    )


def _make_trip() -> Trip:
    return Trip(
        vehicle_id="v1", vehicle_name="Truck",
        origin_hub_id="h1", origin_hub_name="Cleveland",
    )


class TestDetermineDisposition:
    def test_end_of_season_returns_to_hub(self):
        stop = _make_stop("v1", "Stadium")
        trip = _make_trip()
        result = determine_disposition(
            stop, trip, [], 2025, 18,
            customer_id="c1",
        )
        assert result.requires_hub_return is True
        assert "End of season" in (result.hub_return_reason or "")

    def test_same_venue_next_week_leaves_on_site(self):
        stop = _make_stop("v1", "Stadium")
        trip = _make_trip()
        next_games = [_make_game("c1", "v1", "Stadium")]
        result = determine_disposition(
            stop, trip, next_games, 2025, 5,
            customer_id="c1",
        )
        assert result.action == "leave_on_site"
        assert result.requires_hub_return is False

    def test_different_venue_next_week_reroutes(self):
        stop = _make_stop("v1", "Stadium A")
        trip = _make_trip()
        venue = Venue(
            id="v1", customer_id="c1", name="Stadium A",
            address=None, city=None, state=None,
            lat=41.5, lng=-81.7, is_primary=True,
        )
        # Same customer, different nearby venue
        next_games = [_make_game("c1", "v2", "Stadium B", lat=41.6, lng=-81.8)]
        result = determine_disposition(
            stop, trip, next_games, 2025, 5,
            venue=venue, customer_id="c1",
        )
        assert result.action == "reroute_to_next_venue"
        assert result.requires_hub_return is False

    def test_bye_week_leaves_on_site(self):
        stop = _make_stop("v1", "Stadium")
        trip = _make_trip()
        # No game next week for this customer (but other customers play)
        next_games = [_make_game("c2", "v2", "Other Stadium")]
        result = determine_disposition(
            stop, trip, next_games, 2025, 5,
            customer_id="c1",
        )
        assert result.action == "leave_on_site"
        assert result.requires_hub_return is False

    def test_far_venue_returns_to_hub(self):
        stop = _make_stop("v1", "Stadium A")
        trip = _make_trip()
        venue = Venue(
            id="v1", customer_id="c1", name="Stadium A",
            address=None, city=None, state=None,
            lat=41.5, lng=-81.7, is_primary=True,
        )
        # Same customer, very far venue (Florida)
        next_games = [_make_game("c1", "v2", "Florida Stadium", lat=30.0, lng=-82.0)]
        result = determine_disposition(
            stop, trip, next_games, 2025, 5,
            venue=venue, customer_id="c1",
        )
        assert result.action == "return_to_hub"
        assert result.requires_hub_return is True
