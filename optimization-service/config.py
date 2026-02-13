"""
Configuration module for the Dragon Seats Optimization Service.
Loads environment variables with sensible defaults.
"""

import os
from dotenv import load_dotenv

# Load .env from the project root (one level up)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

# Supabase
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Google Maps
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Sentry
SENTRY_DSN = os.getenv("OPTIMIZER_SENTRY_DSN", "")

# Flask
FLASK_PORT = int(os.getenv("FLASK_PORT", "5001"))
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"

# Solver defaults
SOLVER_TIMEOUT_MS = int(os.getenv("SOLVER_TIMEOUT_MS", "30000"))
DISTANCE_CACHE_TOLERANCE = float(os.getenv("DISTANCE_CACHE_TOLERANCE", "0.001"))
GOOGLE_MAPS_RATE_LIMIT_MS = int(os.getenv("GOOGLE_MAPS_RATE_LIMIT_MS", "200"))
MAX_CLUSTER_RADIUS_MILES = float(os.getenv("MAX_CLUSTER_RADIUS_MILES", "150"))
MAX_STOPS_PER_TRIP = int(os.getenv("MAX_STOPS_PER_TRIP", "4"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "25"))

# Time windows (hours)
SETUP_BUFFER_HOURS = float(os.getenv("SETUP_BUFFER_HOURS", "4"))
TEARDOWN_BUFFER_HOURS = float(os.getenv("TEARDOWN_BUFFER_HOURS", "3"))
