#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://www.mannonce.com"
UA = "AkarFinder-public-probe/1.0 (+https://akarfinder.vercel.app)"
OUT = Path("artifacts/mannonce-route-probe")
OUT.mkdir(parents=True, exist_ok=True)
SEEDS = [
    BASE + "/",
    BASE + "/category/immobilier_%C3%A0_vendre/Magasins_et_commerces_%C3%A0_vendre",
    BASE + "/search?page=2",
]

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links: list[str] = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.append(href)


def fetch(url: str) -> tuple[int, str, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*;q=0.8"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return int(getattr(r, "status", 200)), r.geturl(), r.read().decode("utf-8", "replace")


def main():
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(BASE + "/robots.txt")
    rp.read()
    rows = []
    all_paths: list[str] = []
    errors = []
    for seed in SEEDS:
        allowed = rp.can_fetch(UA, seed)
        row = {"url": seed, "robots_allowed": allowed}
        if not allowed:
            row["status"] = None
            rows.append(row)
            continue
        try:
            status, final_url, html = fetch(seed)
            parser = Links(); parser.feed(html)
            same_host = []
            for href in parser.links:
                absolute = urllib.parse.urljoin(final_url, href)
                parsed = urllib.parse.urlsplit(absolute)
                if (parsed.hostname or "").lower() != "www.mannonce.com":
                    continue
                normalized = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, parsed.query, ""))
                same_host.append(normalized)
                all_paths.append(parsed.path)
            row.update({"status": status, "final_url": final_url, "html_bytes": len(html.encode()), "same_host_links": len(set(same_host)), "sample_links": sorted(set(same_host))[:80]})
        except Exception as exc:
            errors.append({"url": seed, "error": repr(exc)})
            row["error"] = repr(exc)
        rows.append(row)
        time.sleep(0.3)

    first_segments = Counter((p.strip("/").split("/")[0] if p.strip("/") else "/") for p in all_paths)
    path_shapes = Counter(re.sub(r"\d+", "{n}", p) for p in all_paths)
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "mannonce.com public HTML",
        "zero_db_writes": True,
        "robots_checked": True,
        "seed_count": len(SEEDS),
        "rows": rows,
        "top_first_segments": first_segments.most_common(30),
        "top_path_shapes": path_shapes.most_common(50),
        "errors": errors,
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(summary, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
