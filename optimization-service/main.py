"""
Dragon Seats Optimization Service
Flask microservice for CVRPTW vehicle routing optimization.
"""

import time
import traceback

from flask import Flask, jsonify, request
from flask_cors import CORS

import config

# Sentry initialization (optional -- only if DSN is set)
if config.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration
    sentry_sdk.init(
        dsn=config.SENTRY_DSN,
        integrations=[FlaskIntegration()],
        traces_sample_rate=0.2,
    )

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

# Suppress Werkzeug request logging to avoid broken-pipe errors
import logging as _logging
_logging.getLogger("werkzeug").setLevel(_logging.ERROR)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "version": "0.1.0",
        "service": "dragon-seats-optimizer",
    })


@app.route("/optimize", methods=["POST"])
def optimize():
    """
    Run the weekly optimization solver.

    Expects JSON body:
    {
        "season_year": 2025,
        "week_number": 1,
        "triggered_by": "user_id_or_cron"
    }

    Returns optimization results including trips, scores, and any warnings.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    season_year = data.get("season_year")
    week_number = data.get("week_number")
    triggered_by = data.get("triggered_by", "manual")

    if season_year is None or week_number is None:
        return jsonify({
            "error": "season_year and week_number are required"
        }), 400

    if not isinstance(season_year, int) or not isinstance(week_number, int):
        return jsonify({
            "error": "season_year and week_number must be integers"
        }), 400

    if week_number < 0 or week_number > 18:
        return jsonify({
            "error": "week_number must be between 0 and 18"
        }), 400

    start_time = time.time()

    try:
        from solver.data_loader import load_week_data, load_next_week_schedule
        from solver.distance_matrix import get_distance_matrix
        from solver.constraints import build_constraints
        from solver.clustering import cluster_venues
        from solver.optimizer import optimize_week
        from solver.week0 import optimize_week0
        from solver.infeasibility import handle_infeasibility
        from solver.lookahead import determine_post_game_disposition
        from solver.scoring import score_run
        from solver.writer import write_results

        # Step 1: Load data
        week_data = load_week_data(season_year, week_number)
        next_week_games = load_next_week_schedule(season_year, week_number)

        if not week_data.games:
            duration_ms = int((time.time() - start_time) * 1000)
            return jsonify({
                "run_id": None,
                "status": "completed",
                "trips_generated": 0,
                "score": 100,
                "duration_ms": duration_ms,
                "warnings": ["No games scheduled for this week"],
                "errors": [],
                "message": f"No games in week {week_number} of {season_year}",
            })

        # Step 2: Build locations list and distance matrix
        locations = week_data.get_all_locations()
        dist_matrix = get_distance_matrix(locations)

        # Step 3: Build constraints
        constraints = build_constraints(week_data)

        # Step 4: Cluster venues for multi-stop trips
        clusters = cluster_venues(
            week_data.game_venues,
            week_data.hub_locations,
            dist_matrix,
            max_radius_miles=config.MAX_CLUSTER_RADIUS_MILES,
            max_stops=config.MAX_STOPS_PER_TRIP,
        )

        # Step 5: Run optimizer
        if week_number == 0:
            result = optimize_week0(
                week_data, dist_matrix, constraints, clusters,
                timeout_ms=config.SOLVER_TIMEOUT_MS,
            )
        else:
            result = optimize_week(
                week_data, dist_matrix, constraints, clusters,
                timeout_ms=config.SOLVER_TIMEOUT_MS,
            )

        # Step 6: Handle infeasibility if needed
        if result.has_unassigned:
            result = handle_infeasibility(week_data, dist_matrix, result)

        # Step 7: Post-game disposition (lookahead)
        result = determine_post_game_disposition(
            result, next_week_games, season_year, week_number
        )

        # Step 8: Score the result
        result = score_run(result, dist_matrix)

        # Step 9: Write results to database
        run_id = write_results(
            result, season_year, week_number, triggered_by
        )

        duration_ms = int((time.time() - start_time) * 1000)

        return jsonify({
            "run_id": str(run_id),
            "status": result.status,
            "trips_generated": len(result.trips),
            "score": result.average_score,
            "duration_ms": duration_ms,
            "warnings": result.warnings,
            "errors": result.errors,
            "unassigned_demands": result.unassigned_demands,
            "constraint_relaxations": result.constraint_relaxations,
        })

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        error_detail = traceback.format_exc()

        if config.SENTRY_DSN:
            import sentry_sdk
            sentry_sdk.capture_exception(e)

        return jsonify({
            "run_id": None,
            "status": "failed",
            "trips_generated": 0,
            "score": 0,
            "duration_ms": duration_ms,
            "warnings": [],
            "errors": [str(e)],
            "detail": error_detail,
        }), 500


if __name__ == "__main__":
    import os
    import sys

    print(f"Dragon Seats Optimizer starting on port {config.FLASK_PORT}")

    # Use waitress (production WSGI server) instead of Werkzeug dev
    # server to avoid OSError: [Errno 22] on Python 3.14 when
    # stdout/stderr handles are piped or closed.
    try:
        from waitress import serve
        serve(app, host="0.0.0.0", port=config.FLASK_PORT)
    except ImportError:
        # Fallback to Werkzeug if waitress is not installed
        _devnull = open(os.devnull, "w")
        sys.stdout = _devnull
        sys.stderr = _devnull

        from werkzeug.serving import WSGIRequestHandler

        class _QuietHandler(WSGIRequestHandler):
            def log_request(self, code="-", size="-"):
                pass

            def log(self, type, message, *args):
                pass

        app.run(
            host="0.0.0.0",
            port=config.FLASK_PORT,
            debug=False,
            request_handler=_QuietHandler,
        )
