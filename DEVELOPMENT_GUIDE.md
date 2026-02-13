# Dragon Seats Control Tower — Development Guide

> Comprehensive handoff document for any Claude instance continuing work on this project.
> Last updated: February 13, 2026

---

## 1. What Is This Project?

Dragon Seats is a logistics company that manufactures and manages ~800 heated benches, shaders, and foot decks for NFL and NCAA football teams. Equipment must be delivered to stadiums before games, serviced on-site, and returned to hubs afterward.

The **Control Tower** is a full-stack web application that serves as the operations cockpit. Its centerpiece is an **OR-Tools CVRPTW optimizer** (Capacitated Vehicle Routing Problem with Time Windows) that generates optimal delivery trip plans each week.

### Business Domain

- **3 hubs**: Cleveland (OH), Kansas City (KS), Jacksonville (FL)
- **~800 assets**: heated_bench, cooling_bench, hybrid_bench, dragon_shader, heated_foot_deck
- **18-week NFL season** (Weeks 1-18) plus **Week 0** (pre-season deployment) and a **Pre** week
- **~48 games per week** across all customers
- Assets are branded per customer and may need rebranding between assignments
- Trips originate from hubs, make 1-4 venue stops, and return to hub
- Personnel (drivers, service techs, lead techs) are assigned to trips
- Vehicles have capacity constraints (weight, cubic feet)

---

## 2. Tech Stack

### Frontend
- **Next.js 16.1.6** with Turbopack (App Router)
- **React 19.2.3**
- **TypeScript 5**
- **Tailwind CSS 4** with shadcn/ui components (Radix primitives)
- **Supabase SSR** for auth and data
- **Sonner** for toast notifications
- **Lucide React** for icons
- **Sentry** for error tracking
- **Resend** for transactional email

### Backend
- **Supabase** (PostgreSQL) — hosted database with auth, realtime, and Row Level Security
- **Python 3.14.3** optimization microservice (Flask + Waitress WSGI server)
- **Google OR-Tools 9.12** — CVRPTW solver
- **Google Maps API** — distance matrix calculations
- **Postgrest/httpx** — Python Supabase client

### Infrastructure
- **Vercel** — Next.js hosting (configured with cron jobs)
- **Railway** — Python optimizer hosting (Procfile + railway.toml present)
- Development runs locally on Windows 11 with project in OneDrive

---

## 3. Project Structure

```
ClaudeTRIAL/
├── CLAUDE.md                    # Claude Code instructions
├── DEVELOPMENT_GUIDE.md         # This file
├── package.json                 # Next.js dependencies
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript config
├── vercel.json                  # Vercel deployment + cron config
├── components.json              # shadcn/ui config
├── playwright.config.ts         # E2E test config
├── postcss.config.mjs           # PostCSS + Tailwind
├── sentry.client.config.ts      # Sentry browser config
├── sentry.server.config.ts      # Sentry server config
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx          # Login page
│   │   ├── (protected)/
│   │   │   ├── layout.tsx              # Sidebar + topbar shell
│   │   │   ├── weekly-planner/         # ★ Core page — optimizer UI
│   │   │   │   ├── page.tsx            # Server component (data fetch)
│   │   │   │   ├── planner-shell.tsx   # Client shell (realtime subs)
│   │   │   │   ├── optimizer-toolbar.tsx # Run Optimizer + Accept All
│   │   │   │   ├── trip-card.tsx       # Individual trip display
│   │   │   │   ├── trip-card-grid.tsx  # Grid of trip cards
│   │   │   │   ├── trip-detail-sheet.tsx # Trip detail side panel
│   │   │   │   ├── manual-trip-sheet.tsx # Manual trip creation
│   │   │   │   ├── warnings-panel.tsx  # Warnings & unassigned demands
│   │   │   │   ├── week-selector.tsx   # Week 0-18 navigation
│   │   │   │   ├── status-filter-bar.tsx
│   │   │   │   ├── approve-gameplan-button.tsx
│   │   │   │   └── actions.ts          # Server actions (accept, update)
│   │   │   ├── assets/                 # Asset management CRUD
│   │   │   ├── customers/              # Customer management CRUD
│   │   │   ├── personnel/              # Personnel management
│   │   │   ├── fleet/                  # Vehicle fleet management
│   │   │   ├── travel/                 # Travel recommendations
│   │   │   ├── season-overview/        # Season-wide grid view
│   │   │   ├── import/                 # CSV data import wizard
│   │   │   └── settings/              # Hub, route, optimizer config
│   │   ├── api/
│   │   │   ├── optimize/route.ts       # ★ Proxy to Python optimizer
│   │   │   ├── cron/monday-run/route.ts # Weekly auto-run (Vercel cron)
│   │   │   └── gameplan/approve/route.ts
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Root redirect
│   │   └── globals.css                 # Tailwind imports
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-sidebar.tsx         # Navigation sidebar
│   │   │   └── topbar.tsx              # Top bar with user menu
│   │   └── ui/                         # shadcn/ui components
│   │       ├── button.tsx, card.tsx, badge.tsx, sheet.tsx, etc.
│   │
│   ├── hooks/
│   │   ├── use-realtime-optimizer.ts   # Supabase realtime for optimizer_runs
│   │   ├── use-realtime-trips.ts       # Supabase realtime for trips table
│   │   ├── use-realtime-assets.ts      # Supabase realtime for assets
│   │   └── use-mobile.ts
│   │
│   ├── lib/
│   │   ├── constants.ts                # SEASON_YEAR, HUBS, NAV_ITEMS
│   │   ├── utils.ts                    # cn() helper
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client
│   │   │   ├── server.ts               # Server Supabase client
│   │   │   └── middleware.ts           # Auth session refresh
│   │   ├── weekly-planner/
│   │   │   ├── types.ts                # ★ All TypeScript types
│   │   │   ├── queries.ts              # fetchWeekData(), fetchFormData()
│   │   │   ├── constants.ts            # Status labels, colors
│   │   │   └── trip-state-machine.ts   # Trip status transitions
│   │   ├── assets/, customers/, personnel/, fleet/
│   │   │   └── types.ts, queries.ts, constants.ts
│   │   ├── email/
│   │   │   ├── send-amendment.ts, send-ops-gameplan.ts, send-staff-assignments.ts
│   │   │   └── templates/
│   │   ├── gameplan/, import/, settings/, travel/, season-overview/
│   │
│   ├── middleware.ts                   # Supabase auth middleware
│   └── instrumentation.ts             # Sentry instrumentation
│
├── optimization-service/               # ★ Python optimizer microservice
│   ├── main.py                         # Flask app + Waitress server
│   ├── config.py                       # Env var loading
│   ├── requirements.txt                # Python dependencies
│   ├── Procfile                        # Railway deployment
│   ├── railway.toml                    # Railway config
│   ├── .env.example                    # Env template
│   ├── solver/
│   │   ├── __init__.py                 # Package docstring
│   │   ├── data_loader.py             # Load week data from Supabase
│   │   ├── distance_matrix.py         # Google Maps API + caching
│   │   ├── constraints.py             # Hard + soft constraint definitions
│   │   ├── clustering.py              # Geographic venue clustering
│   │   ├── optimizer.py               # ★ OR-Tools CVRPTW solver
│   │   ├── week0.py                   # Pre-season deployment logic
│   │   ├── infeasibility.py           # 6-step constraint relaxation
│   │   ├── lookahead.py               # Week N+1 post-game disposition
│   │   ├── scoring.py                 # Trip quality scoring (0-100)
│   │   └── writer.py                  # Write results to Supabase
│   └── tests/
│       ├── conftest.py                 # Test fixtures
│       ├── fixtures/                   # JSON test data
│       └── test_*.py                   # Unit tests for each module
│
├── supabase/
│   └── migrations/
│       ├── 00001_create_enums.sql      # 9 custom enum types
│       ├── 00002_create_tables.sql     # 22 database tables
│       ├── 00003_create_indexes.sql    # Performance indexes
│       ├── 00004_create_triggers.sql   # updated_at triggers
│       ├── 00005_seed_hubs.sql         # 3 hub locations
│       └── 00006_add_movement_names.sql
│
├── data-templates/                     # CSV templates for data import
│   ├── seed/                           # Pre-populated seed CSVs
│   └── *.csv                           # Blank templates
│
├── scripts/
│   ├── seed-demo-data.ts               # Seed script
│   └── smoke-test.ts                   # Deployment smoke test
│
├── e2e/
│   ├── full-workflow.spec.ts           # E2E test
│   └── trip-workflow.spec.ts           # Trip lifecycle E2E
│
└── public/                             # Static assets (SVGs)
```

---

## 4. Database Schema

### Enums (9 types)
| Enum | Values |
|------|--------|
| `asset_type` | heated_bench, cooling_bench, hybrid_bench, dragon_shader, heated_foot_deck |
| `asset_condition` | excellent, good, fair, needs_repair, out_of_service |
| `asset_status` | at_hub, loaded, in_transit, on_site, returning, rebranding |
| `trip_status` | draft, recommended, confirmed, in_transit, on_site, returning, completed, cancelled |
| `personnel_role` | driver, service_tech, lead_tech, sales |
| `contract_type` | lease_1yr, lease_3yr, lease_5yr, one_off_rental, conference_deal |
| `sport_type` | nfl, ncaa_football, mlb, pga, tennis, other |
| `season_phase` | preseason, regular, postseason, bowl_season, offseason |
| `optimizer_run_status` | pending, running, completed, failed, partial |

### Tables (22 total)
| Table | Purpose |
|-------|---------|
| `hubs` | 3 warehouse locations (CLE, KC, JAX) with lat/lng |
| `customers` | NFL/NCAA teams with contact info |
| `venues` | Stadiums with lat/lng, linked to customers |
| `contracts` | Customer equipment lease agreements |
| `contract_items` | Line items specifying asset_type, quantity, branding |
| `assets` | Individual equipment units with serial numbers, status, location tracking |
| `asset_movements` | Audit log of all asset location changes |
| `asset_assignments` | Seasonal asset-to-customer assignments |
| `branding_tasks` | Equipment rebranding work orders |
| `personnel` | Drivers and techs with skills and max drive hours |
| `personnel_availability` | Weekly availability per person |
| `vehicles` | Trucks with capacity constraints |
| `vehicle_availability` | Weekly availability per vehicle |
| `game_schedule` | Full season schedule with dates, times, venues |
| `optimizer_runs` | Run metadata (status, duration, warnings, errors) |
| `trips` | Generated delivery trips with status lifecycle |
| `trip_stops` | Ordered venue stops within a trip |
| `trip_assets` | Assets assigned to each trip/stop |
| `trip_personnel` | Personnel assigned to each trip |
| `travel_recommendations` | Flight/hotel suggestions for personnel |
| `preferred_routes` | Saved flight route preferences |
| `distance_cache` | Cached Google Maps distance calculations |

---

## 5. Optimizer Pipeline (9 Steps)

The Python optimizer at `/optimize` runs this pipeline:

```
Step 1: Load Data        → load_week_data() from Supabase (games, assets, vehicles, etc.)
Step 2: Distance Matrix  → get_distance_matrix() via Google Maps API (with DB caching)
Step 3: Constraints      → build_constraints() — capacity, branding, time windows
Step 4: Clustering       → cluster_venues() — group nearby venues for multi-stop trips
Step 5: Solve            → optimize_week() / optimize_week0() — OR-Tools CVRPTW solver
Step 6: Infeasibility    → handle_infeasibility() — 6-step constraint relaxation cascade
Step 7: Lookahead        → determine_post_game_disposition() — check Week N+1 schedule
Step 8: Scoring          → score_run() — rate trip quality 0-100
Step 9: Write Results    → write_results() — save trips to Supabase (optimizer_runs, trips, trip_stops, trip_assets)
```

### Key solver parameters (from config.py):
- `SOLVER_TIMEOUT_MS`: 30000 (30s per solve attempt)
- `MAX_CLUSTER_RADIUS_MILES`: 150
- `MAX_STOPS_PER_TRIP`: 4
- `SETUP_BUFFER_HOURS`: 4 (arrive 4h before game)
- `TEARDOWN_BUFFER_HOURS`: 3 (depart 3h after game)
- `BATCH_SIZE`: 25

### Data Flow (Browser → DB):
```
Browser click "Run Optimizer"
  → POST /api/optimize (Next.js API route — auth check, rate limiting, 60s debounce)
    → POST localhost:5001/optimize (Python Flask/Waitress)
      → 9-step pipeline
      → Writes to Supabase: optimizer_runs, trips, trip_stops, trip_assets
    ← Returns JSON: { run_id, status, trips_generated, score, warnings, errors }
  ← Proxied to browser
Browser receives response OR Supabase realtime subscription fires onRunComplete()
  → Page refreshes via router.refresh()
```

---

## 6. Environment Variables

Stored in `.env.local` at project root (gitignored). Required:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Maps (for distance matrix)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Optional
OPTIMIZER_SENTRY_DSN=       # Sentry error tracking
FLASK_PORT=5001             # Optimizer service port
FLASK_DEBUG=false
```

Both Next.js and the Python optimizer read from the same `.env.local` file (Python loads it via `python-dotenv` from one directory up).

---

## 7. Development Setup

### Prerequisites
- Node.js (for Next.js)
- Python 3.14+ (in project venv)
- Virtual environment at `optimization-service/.venv/`

### Starting Services

**Next.js dev server:**
```bash
cd ClaudeTRIAL
npx next dev --port 3000
```

**Python optimizer:**
```bash
"optimization-service/.venv/Scripts/python.exe" optimization-service/main.py
# Starts on port 5001 via Waitress WSGI server
```

### Important Notes
- The project lives in OneDrive (`C:\Users\mcgin\OneDrive\Desktop\JHF\ClaudeTRIAL\`) which causes **EBUSY file locking** on `.next` cache files. If the dev server crashes or shows stale routes, delete the `.next` directory and restart.
- **Python 3.14.3** has a known issue with Werkzeug's dev server causing `OSError: [Errno 22] Invalid argument` when stdout/stderr pipes are closed. This is why we use **Waitress** instead.
- Always use the **venv Python** (`optimization-service/.venv/Scripts/python.exe`), not system Python. The venv has all dependencies (OR-Tools, Flask, etc.) installed.
- Stale node processes can occupy port 3000. Kill them with `taskkill //F //IM node.exe` before restarting.

### Health Checks
```bash
curl http://localhost:5001/health
# {"service":"dragon-seats-optimizer","status":"ok","version":"0.1.0"}

curl http://localhost:3000/login
# Should return 200
```

---

## 8. Development History & Current Status

### Phases Completed (from prior sessions)

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Database schema (22 tables, 9 enums, indexes, triggers, hub seeds) | Done |
| 2 | CSV import wizard with preview, validation, and upsert | Done |
| 3 | Data import (seed data loaded for customers, venues, games, assets, vehicles, personnel) | Done |
| 4 | Weekly Planner UI (trip cards, status filters, week selector, detail sheets) | Done |
| 5 | CRUD pages (Assets, Customers, Personnel, Fleet, Season Overview) | Done |
| 6 | Settings page (Hubs, Routes, Optimizer config tabs) | Done |
| 7 | Python optimizer service (OR-Tools CVRPTW, 9-step pipeline, all solver modules) | Done |
| — | Week 0 pre-season deployment support | Done |
| — | Travel recommendations page | Done |
| — | Email notifications (Resend: gameplan, amendments, staff assignments) | Done |
| — | Realtime subscriptions (optimizer runs, trips, assets) | Done |
| — | Sentry error tracking | Done |
| — | Vercel cron (Monday auto-run) | Done |

### Issues Fixed in Most Recent Session

1. **Flask OSError: [Errno 22]** — Python 3.14.3 + Werkzeug piped stdout incompatibility
   - **Fix**: Switched to **Waitress** WSGI server (`waitress>=3.0` in requirements.txt)
   - Fallback to Werkzeug with devnull redirect if waitress not installed

2. **Next.js 404 on all routes** — Stale `.next` cache corrupted by OneDrive file locking
   - **Fix**: Delete `.next` directory completely and restart dev server

3. **Optimizer HTTP timeout** — `AbortSignal.timeout(120000)` killed request before solver finished
   - First increased to 300000ms (5 min) — still too short
   - **Fix**: Removed `AbortSignal.timeout` entirely from both `src/app/api/optimize/route.ts` and `src/app/(protected)/weekly-planner/optimizer-toolbar.tsx`
   - The optimizer takes 2-5 minutes; realtime subscription handles UI updates regardless

4. **Project file hygiene** — ~80+ scratch files from Claude sessions cluttered root
   - **Fix**: Deleted all `_*.js`, `_*.py`, `_*.b64`, temp directories, non-project files
   - Updated `.gitignore` to block future scratch file accumulation
   - Full codebase committed and pushed to GitHub

### Known Remaining Issue — MUST FIX

**The "Run Optimizer" button click from the UI is not working end-to-end.** Specifically:

- The button renders correctly (not disabled)
- When clicked, it should change to "Optimizing..." and fire `POST /api/optimize`
- **Problem observed**: The page may not be fully **hydrating** (React client JS not attaching to server-rendered HTML). When inspected via Chrome DevTools, the button's DOM element had no `__reactFiber` or `__reactProps` keys, meaning React hadn't attached its event handlers.
- A **console error** was observed when clicking the button but was not captured before the window closed
- The optimizer itself works perfectly when called directly via curl:
  ```bash
  curl -X POST http://localhost:5001/optimize \
    -H "Content-Type: application/json" \
    -d '{"season_year":2025,"week_number":1,"triggered_by":"cli-test"}'
  ```
  This produces 14-56 trips and writes them to the database successfully.

**Troubleshooting steps needed:**
1. Open `http://localhost:3000/weekly-planner` in Chrome
2. Open DevTools → Console tab
3. Click "Run Optimizer" and capture the console error
4. The error likely relates to:
   - A hydration mismatch preventing React from attaching to the DOM
   - A missing or failed client-side JS bundle
   - Turbopack compilation error on a client component
5. Fix the hydration/JS error so the button works from the browser

---

## 9. Key Data Flow Patterns

### Optimizer Run Lifecycle
```
1. User clicks "Run Optimizer" in OptimizerToolbar
2. Client POST /api/optimize (no timeout)
3. API route:
   a. Auth check (Supabase session)
   b. Rate limit check (no pending/running runs for this week)
   c. Debounce check (no completed run in last 60s)
   d. Forward to Python: POST localhost:5001/optimize
4. Python 9-step pipeline runs (2-5 minutes)
5. Results written to DB (optimizer_runs + trips + trip_stops + trip_assets)
6. Python returns JSON response
7. Meanwhile, Supabase realtime fires UPDATE on optimizer_runs table
8. useRealtimeOptimizer hook detects status="completed" → calls onRunComplete()
9. PlannerShell calls router.refresh() → server component re-fetches data
10. UI updates with new trips
```

### Trip Status State Machine
```
draft → recommended → confirmed → in_transit → on_site → returning → completed
                                                                    ↘ cancelled
```

### Realtime Subscriptions
- `useRealtimeOptimizer`: Listens for `optimizer_runs` UPDATE where status becomes completed/failed/partial
- `useRealtimeTrips`: Listens for trips INSERT/UPDATE/DELETE for the current week
- `useRealtimeAssets`: Listens for assets UPDATE (status changes during trip execution)

---

## 10. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/optimize` | POST | Proxy to Python optimizer with auth + rate limiting |
| `/api/cron/monday-run` | POST | Vercel cron: auto-run optimizer every Monday at 11 AM |
| `/api/gameplan/approve` | POST | Approve the weekly game plan |

---

## 11. Testing

### Python Optimizer Tests
```bash
cd optimization-service
.venv/Scripts/python.exe -m pytest tests/ -v
```

Test files: `test_constraints.py`, `test_data_loader.py`, `test_distance_matrix.py`, `test_infeasibility.py`, `test_lookahead.py`, `test_optimizer.py`, `test_scoring.py`

### Next.js Build
```bash
npm run build
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

---

## 12. Deployment

### Next.js → Vercel
- Config in `vercel.json` (cron jobs, security headers)
- Env vars must be set in Vercel dashboard

### Python Optimizer → Railway
- Config in `Procfile` and `railway.toml`
- Set `OPTIMIZATION_SERVICE_URL` env var in Vercel to point to Railway URL
- For local dev, defaults to `http://localhost:5001`

---

## 13. Git Repository

- **Remote**: https://github.com/chris-walker0151/ClaudeTRIAL.git
- **Branch**: `main`
- **Latest commit**: `5dc4055` — "Add Dragon Seats Control Tower platform codebase" (248 files)
- **`.gitignore`** blocks: `node_modules/`, `.next/`, `.venv/`, `__pycache__/`, `.env*`, `.claude/`, scratch files (`_*.js`, `_*.py`, etc.), `.docx`, `.xlsx`

---

## 14. Immediate Next Steps (Priority Order)

1. **Fix the UI hydration/console error** — The "Run Optimizer" button doesn't fire from the browser. Capture and fix the console error. This is the #1 blocker.

2. **Verify full optimizer → UI flow** — After fixing the button, run the optimizer from the UI, wait for completion, and confirm:
   - Button shows "Optimizing..." during run
   - Success toast appears with trip count and score
   - Trip cards render in the grid
   - "Accept All (N)" button shows correct count
   - Warnings panel shows unassigned demands

3. **Test Week 0 from UI** — Navigate to Week "Pre" and run the optimizer to verify the pre-season deployment logic works via the UI.

4. **Address the 125 warnings / 120 unassigned demands** — The warnings panel shows 125 warnings and 120 unassigned demands. These are likely due to insufficient asset availability (e.g., "Only 0 of 8 hybrid_bench available"). This may indicate:
   - Asset assignments not properly linked to customers
   - Assets not in "at_hub" status
   - Contract items specifying quantities that exceed available inventory

5. **Production deployment** — Deploy Next.js to Vercel + Python optimizer to Railway. Set all env vars. Test with production Supabase.
