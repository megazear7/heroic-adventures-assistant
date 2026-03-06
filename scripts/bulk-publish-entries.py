"""
Bulk publish all ruleReference entries in Contentful.
Fetches all entries, then publishes each one.
"""
import json
import os
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# Read config
mcp_config_path = os.path.expanduser("~/Library/Application Support/Code/User/mcp.json")
with open(mcp_config_path) as f:
    mcp_config = json.load(f)

servers = mcp_config.get("servers", mcp_config.get("mcpServers", {}))
contentful_cfg = servers.get("contentful-mcp", {})
env = contentful_cfg.get("env", {})

TOKEN = env["CONTENTFUL_MANAGEMENT_ACCESS_TOKEN"]
SPACE_ID = env.get("SPACE_ID", "1xrzrik78qmb")
ENVIRONMENT_ID = env.get("ENVIRONMENT_ID", "master")
HOST = env.get("CONTENTFUL_HOST", "api.contentful.com")

BASE_URL = f"https://{HOST}/spaces/{SPACE_ID}/environments/{ENVIRONMENT_ID}"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/vnd.contentful.management.v1+json",
}

# Step 1: Fetch all ruleReference entry IDs and versions (draft or changed only)
print("Fetching ruleReference entries (draft or changed)...")
all_entries = []
skip = 0
limit = 100

while True:
    url = f"{BASE_URL}/entries?content_type=ruleReference&select=sys.id,sys.version,sys.publishedVersion&limit={limit}&skip={skip}"
    req = Request(url, headers=HEADERS)
    resp = urlopen(req)
    data = json.loads(resp.read())
    items = data.get("items", [])
    total = data.get("total", 0)

    for item in items:
        version = item["sys"]["version"]
        published_version = item["sys"].get("publishedVersion")
        # Draft: never published (no publishedVersion)
        # Changed: published but version > publishedVersion + 1
        is_draft = published_version is None
        is_changed = published_version is not None and version > published_version + 1
        if is_draft or is_changed:
            all_entries.append(item)

    fetched_so_far = skip + len(items)
    print(f"  Scanned {fetched_so_far}/{total}, found {len(all_entries)} to publish")
    if fetched_so_far >= total:
        break
    skip += limit
    time.sleep(0.1)

print(f"Total entries to publish: {len(all_entries)}")

# Step 2: Publish each entry
success = 0
failed = 0
errors = []

for i, entry in enumerate(all_entries):
    entry_id = entry["sys"]["id"]
    version = entry["sys"]["version"]

    url = f"{BASE_URL}/entries/{entry_id}/published"
    req = Request(
        url,
        headers={**HEADERS, "X-Contentful-Version": str(version)},
        method="PUT",
    )

    try:
        resp = urlopen(req)
        success += 1
        if (success + failed) % 25 == 0:
            print(f"  Progress: {success + failed}/{len(all_entries)} (published={success}, failed={failed})")
        time.sleep(0.15)
    except HTTPError as e:
        err_body = e.read().decode("utf-8")
        failed += 1
        errors.append({"id": entry_id, "status": e.code, "error": err_body[:300]})
        if e.code == 429:
            retry_after = int(e.headers.get("X-Contentful-RateLimit-Reset", 5))
            print(f"  Rate limited, waiting {retry_after}s...")
            time.sleep(retry_after)
            try:
                resp = urlopen(req)
                success += 1
                failed -= 1
                errors.pop()
            except HTTPError:
                print(f"  RETRY FAILED: {entry_id}")
        else:
            print(f"  FAILED [{e.code}]: {entry_id}: {err_body[:150]}")
            time.sleep(0.5)

print(f"\n=== DONE ===")
print(f"Published: {success}")
print(f"Failed: {failed}")
print(f"Total: {success + failed}/{len(all_entries)}")

if errors:
    print(f"\nErrors ({len(errors)}):")
    for e in errors[:10]:
        print(f"  {e['id']}: {e.get('status', '?')} - {e['error'][:100]}")
