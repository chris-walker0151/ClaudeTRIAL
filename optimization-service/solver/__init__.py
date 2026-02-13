"""
Dragon Seats Optimization Solver Package

Core modules:
- data_loader: Read week data from Supabase
- distance_matrix: Cached distance lookups via Google Maps
- constraints: Hard + soft constraint definitions
- clustering: Geographic multi-stop grouping
- optimizer: OR-Tools CVRPTW solver
- infeasibility: 6-step constraint relaxation cascade
- lookahead: Week N+1 post-game disposition
- scoring: Trip quality scoring (0-100)
- writer: Write results to Supabase
"""
