"""
Week N+1 lookahead module — determines post-game asset disposition.

After each game, the optimizer decides what happens to equipment:
- leave_on_site: Same customer, same venue next week (or bye week)
- reroute_to_next_venue: Nearby customer has game next week
- return_to_hub: Asset needs rebranding, damage, or end of season

This reduces unnecessary hub returns and minimizes transportation costs.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from solver.data_loader import Game, LatLng, Venue
from solver.optimizer import OptimizationResult, Trip, TripStop


@dataclass
class Disposition:
    """Post-game disposition decision for a trip stop."""
    action: str  # leave_on_site, reroute_to_next_venue, return_to_hub
    requires_hub_return: bool
    hub_return_reason: str | None = None
    next_venue_id: str | None = None
    next_venue_name: str | None = None


def _haversine_miles(a: LatLng, b: LatLng) -> float:
    """Calculate haversine distance in miles."""
    R = 3959
    lat1, lat2 = math.radians(a.lat), math.radians(b.lat)
    dlat = math.radians(b.lat - a.lat)
    dlng = math.radians(b.lng - a.lng)
    h = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(h))


def _find_next_week_game_for_customer(
    customer_id: str,
    next_week_games: list[Game],
) -> Game | None:
    """Find if this customer has a game next week."""
    for game in next_week_games:
        if game.customer_id == customer_id:
            return game
    return None


def _find_nearby_game_next_week(
    venue: Venue,
    next_week_games: list[Game],
    max_distance_miles: float = 200.0,
) -> Game | None:
    """
    Find a nearby game next week that could reuse these assets.
    Only considers games at venues within max_distance_miles.
    """
    if not venue.location:
        return None

    best_game: Game | None = None
    best_distance = float("inf")

    for game in next_week_games:
        if not game.venue or not game.venue.location:
            continue
        distance = _haversine_miles(venue.location, game.venue.location)
        if distance < max_distance_miles and distance < best_distance:
            best_distance = distance
            best_game = game

    return best_game


def determine_disposition(
    stop: TripStop,
    trip: Trip,
    next_week_games: list[Game],
    season_year: int,
    week_number: int,
    venue: Venue | None = None,
    customer_id: str | None = None,
) -> Disposition:
    """
    Determine the post-game disposition for a single trip stop.

    Decision tree:
    1. End of season → return_to_hub
    2. Same customer, same venue next week → leave_on_site
    3. Same customer, different venue next week → reroute_to_next_venue
    4. Nearby customer has game next week → reroute_to_next_venue
    5. No game next week (bye) → leave_on_site (idle staging)
    6. Default → return_to_hub
    """
    # Week 0 pre-season: always leave on site (equipment is being deployed)
    if week_number == 0:
        return Disposition(
            action="leave_on_site",
            requires_hub_return=False,
        )

    # End of season (week 18)
    if week_number >= 18:
        return Disposition(
            action="return_to_hub",
            requires_hub_return=True,
            hub_return_reason="End of season — all assets return to hub",
        )

    # No next week games at all (shouldn't happen mid-season)
    if not next_week_games:
        return Disposition(
            action="leave_on_site",
            requires_hub_return=False,
        )

    # Check if same customer has a game next week
    demand = stop.demand
    cust_id = customer_id or (demand.customer_id if demand else None)

    if cust_id:
        next_game = _find_next_week_game_for_customer(cust_id, next_week_games)

        if next_game:
            # Same customer has a game next week
            if next_game.venue_id == stop.venue_id:
                # Same venue! Leave equipment on site.
                return Disposition(
                    action="leave_on_site",
                    requires_hub_return=False,
                )
            elif next_game.venue and next_game.venue.location and venue and venue.location:
                # Different venue — reroute
                distance = _haversine_miles(venue.location, next_game.venue.location)
                if distance < 500:  # Within reasonable reroute distance
                    return Disposition(
                        action="reroute_to_next_venue",
                        requires_hub_return=False,
                        next_venue_id=next_game.venue_id,
                        next_venue_name=next_game.venue.name if next_game.venue else None,
                    )
                else:
                    # Too far — return to hub for redistribution
                    return Disposition(
                        action="return_to_hub",
                        requires_hub_return=True,
                        hub_return_reason=f"Next venue too far ({distance:.0f} mi) — return to hub",
                    )
        else:
            # Customer has no game next week (bye week) — leave on site
            return Disposition(
                action="leave_on_site",
                requires_hub_return=False,
            )

    # Check for nearby games next week (different customer)
    if venue:
        nearby_game = _find_nearby_game_next_week(venue, next_week_games)
        if nearby_game and nearby_game.venue:
            return Disposition(
                action="reroute_to_next_venue",
                requires_hub_return=False,
                next_venue_id=nearby_game.venue_id,
                next_venue_name=nearby_game.venue.name if nearby_game.venue else None,
            )

    # Default: leave on site (cheaper than unnecessary return)
    return Disposition(
        action="leave_on_site",
        requires_hub_return=False,
    )


def determine_post_game_disposition(
    result: OptimizationResult,
    next_week_games: list[Game],
    season_year: int,
    week_number: int,
) -> OptimizationResult:
    """
    Apply post-game disposition logic to all trip stops.

    Updates each TripStop with:
    - requires_hub_return: bool
    - hub_return_reason: str | None
    """
    # Build venue lookup from trips
    for trip in result.trips:
        for stop in trip.stops:
            demand = stop.demand
            customer_id = demand.customer_id if demand else None

            # Create a minimal Venue for lookups
            venue = None
            if demand and demand.game and demand.game.venue:
                venue = demand.game.venue

            disposition = determine_disposition(
                stop=stop,
                trip=trip,
                next_week_games=next_week_games,
                season_year=season_year,
                week_number=week_number,
                venue=venue,
                customer_id=customer_id,
            )

            stop.requires_hub_return = disposition.requires_hub_return
            stop.hub_return_reason = disposition.hub_return_reason

            if disposition.action == "reroute_to_next_venue":
                result.warnings.append(
                    f"{stop.venue_name}: Reroute assets to "
                    f"{disposition.next_venue_name or 'next venue'} for next week"
                )

    return result
