"""
Fix game_schedule records — set venue_id based on customer's primary venue.
Uses bulk PATCH calls grouped by customer_id for speed.
"""
import sys
import httpx
sys.path.insert(0, ".")
import config

headers = {
    "apikey": config.SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {config.SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}
base = config.SUPABASE_URL + "/rest/v1"

# Step 1: Get all venues
resp = httpx.get(f"{base}/venues", headers=headers, params={
    "select": "id,customer_id,name,is_primary",
}, timeout=15.0)
resp.raise_for_status()
venues = resp.json()
print(f"Found {len(venues)} venues")

# Build mapping: customer_id -> primary venue_id
customer_venue_map = {}
for v in venues:
    cid = v.get("customer_id")
    if not cid:
        continue
    if cid not in customer_venue_map or v.get("is_primary"):
        customer_venue_map[cid] = v["id"]

print(f"Customer-to-venue mapping: {len(customer_venue_map)} entries")

# Step 2: For each customer, bulk-update all their games
updated_total = 0
for customer_id, venue_id in customer_venue_map.items():
    resp = httpx.patch(
        f"{base}/game_schedule",
        headers=headers,
        params={
            "customer_id": f"eq.{customer_id}",
            "venue_id": "is.null",
        },
        json={"venue_id": venue_id},
        timeout=30.0,
    )
    resp.raise_for_status()
    # Count how many were updated (check status code 204 = success)
    updated_total += 1
    print(f"  Updated games for customer {customer_id[:8]}... -> venue {venue_id[:8]}...")

print(f"\nDone! Updated games for {updated_total} customers")

# Verify
resp = httpx.get(f"{base}/game_schedule", headers=headers, params={
    "select": "id",
    "venue_id": "is.null",
}, timeout=15.0)
remaining = resp.json()
print(f"Games still without venue_id: {len(remaining)}")

resp = httpx.get(f"{base}/game_schedule", headers=headers, params={
    "select": "id",
    "venue_id": "not.is.null",
}, timeout=15.0)
fixed = resp.json()
print(f"Games with venue_id: {len(fixed)}")
