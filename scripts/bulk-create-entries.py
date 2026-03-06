"""
Bulk create Contentful ruleReference entries using the Management API.
Reads payloads from scripts/payloads/ and creates entries in Contentful.
"""
import json
import os
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# Read config from VS Code MCP settings
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

# Track progress
progress_file = Path("scripts/create-progress.json")
if progress_file.exists():
    created = set(json.loads(progress_file.read_text()))
else:
    created = set()

manifest = json.load(open("scripts/manifest.json"))
payloads_dir = Path("scripts/payloads")

success = 0
skipped = 0
failed = 0
errors = []

for i, entry in enumerate(manifest):
    slug = entry["slug"]

    if slug in created:
        skipped += 1
        continue

    payload_file = payloads_dir / f"{slug}.json"
    if not payload_file.exists():
        print(f"  MISSING payload: {slug}")
        failed += 1
        errors.append({"slug": slug, "error": "missing payload"})
        continue

    payload = json.load(open(payload_file))
    fields = payload["fields"]

    body = json.dumps({"fields": fields}).encode("utf-8")

    req = Request(
        f"{BASE_URL}/entries",
        data=body,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/vnd.contentful.management.v1+json",
            "X-Contentful-Content-Type": "ruleReference",
        },
        method="POST",
    )

    try:
        resp = urlopen(req)
        resp_data = json.loads(resp.read())
        entry_id = resp_data["sys"]["id"]
        created.add(slug)
        success += 1

        if (success + skipped) % 25 == 0 or success + skipped == len(manifest):
            print(f"  Progress: {success + skipped}/{len(manifest)} (created={success}, skipped={skipped}, failed={failed})")

        # Save progress periodically
        if success % 10 == 0:
            progress_file.write_text(json.dumps(sorted(created), indent=2))

        # Rate limiting: Contentful allows ~10 req/s for CMA
        time.sleep(0.15)

    except HTTPError as e:
        err_body = e.read().decode("utf-8")
        failed += 1
        errors.append({"slug": slug, "status": e.code, "error": err_body[:300]})
        print(f"  FAILED [{e.code}]: {slug}: {err_body[:200]}")

        # If rate limited, wait and retry
        if e.code == 429:
            retry_after = int(e.headers.get("X-Contentful-RateLimit-Reset", 5))
            print(f"  Rate limited, waiting {retry_after}s...")
            time.sleep(retry_after)
            # Retry
            try:
                resp = urlopen(req)
                resp_data = json.loads(resp.read())
                created.add(slug)
                success += 1
                failed -= 1
                errors.pop()
            except HTTPError as e2:
                print(f"  RETRY FAILED [{e2.code}]: {slug}")
        else:
            time.sleep(0.5)  # Brief pause on errors

    except Exception as e:
        failed += 1
        errors.append({"slug": slug, "error": str(e)})
        print(f"  ERROR: {slug}: {e}")

# Final save
progress_file.write_text(json.dumps(sorted(created), indent=2))

print(f"\n=== DONE ===")
print(f"Created: {success}")
print(f"Skipped: {skipped}")
print(f"Failed: {failed}")
print(f"Total: {success + skipped + failed}/{len(manifest)}")

if errors:
    print(f"\nErrors ({len(errors)}):")
    for e in errors[:10]:
        print(f"  {e['slug']}: {e.get('status', '?')} - {e['error'][:100]}")
    err_file = Path("scripts/create-errors.json")
    err_file.write_text(json.dumps(errors, indent=2))
    print(f"Full errors saved to {err_file}")
