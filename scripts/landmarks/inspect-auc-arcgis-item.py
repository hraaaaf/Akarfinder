#!/usr/bin/env python3
"""Inspect a public AUC ArcGIS Portal item without authentication or bypasses.

Authoring-only diagnostic. Writes an artifact even when the public portal is
unreachable, so a globally green workflow cannot be mistaken for geometry
discovery success.
"""
import argparse
import json
import sys
import urllib.error
import urllib.request

def get_json(url: str, timeout: float):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "AkarFinder-Landmark-Factory/1.0 public-read-only"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8")
        return {"ok": True, "url": url, "data": json.loads(raw)}
    except Exception as exc:
        return {
            "ok": False,
            "url": url,
            "error_type": type(exc).__name__,
            "error": str(exc),
        }

def collect_urls(value, out):
    if isinstance(value, dict):
        for v in value.values():
            collect_urls(v, out)
    elif isinstance(value, list):
        for v in value:
            collect_urls(v, out)
    elif isinstance(value, str) and value.startswith(("http://", "https://")):
        out.add(value)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--portal", required=True)
    ap.add_argument("--item-id", required=True)
    ap.add_argument("--official-page", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--timeout", type=float, default=12)
    args = ap.parse_args()

    portal = args.portal.rstrip("/")
    base = f"{portal}/sharing/rest/content/items/{args.item_id}"
    meta = get_json(f"{base}?f=json", args.timeout)
    data = get_json(f"{base}/data?f=json", args.timeout)

    urls = set()
    if meta["ok"]:
        collect_urls(meta["data"], urls)
    if data["ok"]:
        collect_urls(data["data"], urls)

    service_urls = sorted(
        u for u in urls
        if "/rest/services/" in u.casefold()
        or u.casefold().endswith(("/featureserver", "/mapserver"))
    )

    status = "accessible" if meta["ok"] or data["ok"] else "inaccessible"
    out = {
        "status": status,
        "authoring_only": True,
        "official_page": args.official_page,
        "portal": portal,
        "item_id": args.item_id,
        "metadata": meta,
        "item_data": data,
        "discovered_urls": sorted(urls),
        "arcgis_service_urls": service_urls,
        "geometry_claim": "none",
        "guardrail": "Casa-Anfa planning geometry is not automatically the CFC product boundary.",
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps({
        "status": status,
        "item_id": args.item_id,
        "service_url_count": len(service_urls),
        "output": args.out,
    }, ensure_ascii=False, indent=2))
    if status != "accessible":
        return 2
    return 0

if __name__ == "__main__":
    sys.exit(main())
