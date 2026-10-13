"""Survey configured Moroccan sources before detail collection; text only."""
import concurrent.futures
import json
import re
from datetime import datetime, timezone
from urllib.parse import urljoin, urlsplit
from pipeline import Client, Page, ROOT, atomic_json, canonical, date, extract

def inspect(config):
    result = {"domain": config["domain"], "observed_at": datetime.now(timezone.utc).isoformat(), "photos_downloaded": 0, "attempts": []}
    # www is a normal public origin alternative, not a protection bypass.
    # It is tried only when the initial origin redirects, never after 403/challenge.
    origins = ["https://" + config["domain"], "https://www." + config["domain"]]
    for origin in origins:
        try:
            client = Client(origin, allow_missing_robots=True)
            page = Page()
            page.feed(client.get(origin + "/"))
            urls = []
            for href in page.anchors:
                try:
                    u = canonical(urljoin(origin + "/", href))
                except ValueError:
                    continue
                if urlsplit(u).netloc != urlsplit(origin).netloc:
                    continue
                for pattern in config.get("listing_url_patterns", []):
                    expr = pattern.get("pattern") if isinstance(pattern, dict) else pattern
                    flags = re.I if isinstance(pattern, dict) and pattern.get("case_insensitive") else 0
                    if expr and re.search(expr, urlsplit(u).path, flags) and u not in urls:
                        urls.append(u)
            result.update(origin=origin, robots_status=client.robots_status, homepage_status=200, detail_candidates=len(urls), candidate_sample=urls[:10], samples=[])
            for u in urls[:3]:
                try:
                    h = client.get(u)
                    row = extract(h, u)
                    result["samples"].append({"url": u, "publication": row.get("date_publication"), "publication_evidence": row.get("preuves", {}).get("date_publication"), "fields": sorted(k for k in ("ville", "quartier", "superficie", "prix", "type") if row.get(k)), "error": row.get("erreur")})
                except Exception as e:
                    result["samples"].append({"url": u, "error": str(e)[:200]})
                    break
            result["status"] = "sampled" if urls else "no_homepage_detail_candidates"
            break
        except Exception as e:
            error = str(e)[:200]
            result["attempts"].append({"origin": origin, "error": error})
            result["status"] = "unavailable"
            if "redirect_requires_review" not in error:
                break
    print(json.dumps({"domain": result["domain"], "status": result["status"], "samples": len(result.get("samples", []))}), flush=True)
    return result

if __name__ == "__main__":
    configs = json.loads((ROOT / "scripts" / "fresh-listings" / "extended-sources.json").read_text(encoding="utf-8"))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        rows = list(pool.map(inspect, configs))
    atomic_json(ROOT / "data" / "annonces-fraiches" / "extended-source-survey.json", {"observed_at": datetime.now(timezone.utc).isoformat(), "sources": rows, "photos_downloaded": 0, "production_writes": 0})
