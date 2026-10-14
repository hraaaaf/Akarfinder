"""Read-only source discovery survey; no images or production writes."""
import concurrent.futures
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from pipeline import Client, Page, atomic_json, canonical, robots_allowed

ORIGINS = [
    "https://logeland.com",
    "https://www.marocimmo.com",
    "https://sawim.ma",
    "https://www.masaken.ma",
    "https://immobilier.cari.ma",
    "https://www.avito.ma",
    "https://www.marocannonces.com",
    "https://mouldar.com",
]

def inspect(origin):
    result = {"origin": origin, "observed_at": datetime.now(timezone.utc).isoformat(), "photos_downloaded": 0}
    try:
        client = Client(origin)
        result["robots_home_allowed"] = robots_allowed(client.robots, origin + "/")[0]
        if not result["robots_home_allowed"]:
            result["status"] = "robots_disallowed"
            return result
        page = Page()
        home = origin + ("/fr" if origin in {"https://logeland.com", "https://www.marocimmo.com", "https://mouldar.com"} else "/")
        page.feed(client.get(home))
        links = []
        for href in page.anchors:
            url = urljoin(origin + "/", href)
            try:
                url = canonical(url)
            except ValueError:
                continue
            if urlsplit(url).netloc == urlsplit(origin).netloc and url not in links:
                links.append(url)
        result.update(status="public_text_accessible", links=links[:150], homepage_publication_metadata=page.meta.get("article:published_time"))
    except Exception as e:
        result.update(status="unavailable", error=str(e)[:300])
    print(json.dumps({"origin": origin, "status": result["status"], "links": len(result.get("links", []))}), flush=True)
    return result

if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(inspect, ORIGINS))
    path = Path(__file__).resolve().parents[2] / "data" / "annonces-fraiches" / "source-survey.json"
    atomic_json(path, {"observed_at": datetime.now(timezone.utc).isoformat(), "sources": results, "photos_downloaded": 0})
