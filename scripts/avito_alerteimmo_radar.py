#!/usr/bin/env python3
import argparse
import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from collections import deque
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://alerteimmo.ma"
UA = "AkarFinder-Audit/1.0 (+https://akarfinder.vercel.app; read-only public-surface audit)"
AVITO_RE = re.compile(r"https?://(?:www\.)?avito\.ma/fr/[^\"'<>\s]+?_(\d{6,12})\.htm", re.I)
ALLOWED_PREFIXES = ("/louer/", "/acheter/", "/quartiers/")


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.append(href)


def fetch(url, timeout=10):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept": "text/html,application/xml;q=0.9,*/*;q=0.8"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.headers.get("Content-Type", ""), r.read().decode("utf-8", "replace")


def normalize_same_domain(href, current):
    u = urllib.parse.urljoin(current, href)
    p = urllib.parse.urlparse(u)
    if p.scheme not in ("http", "https") or p.netloc.lower() not in ("alerteimmo.ma", "www.alerteimmo.ma"):
        return None
    path = p.path.rstrip("/") or "/"
    if path == "/" or path == "/quartiers" or path.startswith(ALLOWED_PREFIXES):
        return urllib.parse.urlunparse(("https", "alerteimmo.ma", path, "", "", ""))
    return None


def shard_for(url, shard_count):
    digest = hashlib.sha256(url.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") % shard_count


def sitemap_urls(rp, sleep_s, errors, deadline):
    found = set()
    todo = deque([BASE + "/sitemap.xml"])
    seen = set()
    loc_re = re.compile(r"<loc>\s*(.*?)\s*</loc>", re.I | re.S)
    while todo and len(seen) < 20 and time.monotonic() < deadline:
        url = todo.popleft()
        if url in seen or not rp.can_fetch(UA, url):
            continue
        seen.add(url)
        try:
            _, _, txt = fetch(url)
            time.sleep(sleep_s)
        except Exception as e:
            errors.append({"url": url, "stage": "sitemap", "error": repr(e)})
            continue
        for raw in loc_re.findall(txt):
            loc = raw.strip().replace("&amp;", "&")
            if loc.endswith(".xml") and urllib.parse.urlparse(loc).netloc.endswith("alerteimmo.ma"):
                todo.append(loc)
            else:
                n = normalize_same_domain(loc, BASE)
                if n:
                    found.add(n)
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--max-pages", type=int, default=180)
    ap.add_argument("--sleep", type=float, default=0.4)
    ap.add_argument("--shard-index", type=int, default=0)
    ap.add_argument("--shard-count", type=int, default=1)
    ap.add_argument("--time-budget-seconds", type=int, default=720)
    args = ap.parse_args()

    if args.shard_count < 1 or not 0 <= args.shard_index < args.shard_count:
        raise SystemExit("invalid shard configuration")
    if args.time_budget_seconds < 60:
        raise SystemExit("time budget must be >= 60 seconds")

    started = time.monotonic()
    deadline = started + args.time_budget_seconds
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    baseline = {x.strip() for x in Path(args.baseline).read_text().splitlines() if x.strip()}
    if len(baseline) != 6581:
        raise SystemExit(f"Expected certified baseline 6581, got {len(baseline)}")

    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(BASE + "/robots.txt")
    robots_error = None
    try:
        rp.read()
    except Exception as e:
        robots_error = repr(e)
        raise SystemExit(f"robots.txt unavailable; refusing crawl: {e}")

    errors = []
    all_seeds = {BASE + "/", BASE + "/quartiers"}
    all_seeds |= sitemap_urls(rp, args.sleep, errors, deadline)
    shard_seeds = {
        u for u in all_seeds
        if u in (BASE + "/", BASE + "/quartiers") or shard_for(u, args.shard_count) == args.shard_index
    }
    q = deque(sorted(shard_seeds))
    queued = set(q)
    visited = set()
    records = {}
    blocked_by_robots = 0
    stopped_by = "queue_exhausted"

    while q and len(visited) < args.max_pages:
        if time.monotonic() >= deadline:
            stopped_by = "time_budget"
            break
        url = q.popleft()
        if url in visited:
            continue
        if not rp.can_fetch(UA, url):
            blocked_by_robots += 1
            continue
        try:
            status, ctype, html = fetch(url)
            time.sleep(args.sleep)
        except Exception as e:
            errors.append({"url": url, "stage": "page", "error": repr(e)})
            visited.add(url)
            continue
        visited.add(url)
        if status != 200 or "html" not in ctype.lower():
            continue

        for m in AVITO_RE.finditer(html):
            aid = m.group(1)
            records.setdefault(aid, {"id": aid, "avito_url": m.group(0), "evidence_pages": []})
            if len(records[aid]["evidence_pages"]) < 5 and url not in records[aid]["evidence_pages"]:
                records[aid]["evidence_pages"].append(url)

        parser = LinkParser()
        try:
            parser.feed(html)
        except Exception:
            pass
        for href in parser.links:
            n = normalize_same_domain(href, url)
            if not n or n in visited or n in queued:
                continue
            if n not in (BASE + "/", BASE + "/quartiers") and shard_for(n, args.shard_count) != args.shard_index:
                continue
            q.append(n)
            queued.add(n)

    if q and len(visited) >= args.max_pages:
        stopped_by = "page_cap"

    ids = set(records)
    overlap = ids & baseline
    net_new = ids - baseline
    union = ids | baseline
    truncated = bool(q)

    for name, values in (
        ("alerteimmo_ids.txt", ids),
        ("overlap_ids.txt", overlap),
        ("net_new_ids.txt", net_new),
        ("union_ids.txt", union),
    ):
        (out / name).write_text("\n".join(sorted(values, key=int)) + ("\n" if values else ""), encoding="utf-8")

    with (out / "records.jsonl").open("w", encoding="utf-8") as f:
        for aid in sorted(records, key=int):
            f.write(json.dumps(records[aid], ensure_ascii=False, sort_keys=True) + "\n")

    summary = {
        "source": "alerteimmo.ma public HTML + sitemap",
        "baseline_unique_ids": len(baseline),
        "alerteimmo_unique_avito_ids": len(ids),
        "overlap_with_baseline": len(overlap),
        "net_new_vs_baseline": len(net_new),
        "union_unique_ids": len(union),
        "gain_pct": round((len(net_new) / len(baseline)) * 100, 4),
        "pages_visited": len(visited),
        "pages_queued_remaining": len(q),
        "seed_count_total": len(all_seeds),
        "seed_count_shard": len(shard_seeds),
        "shard": {"index": args.shard_index, "count": args.shard_count},
        "robots": {"url": BASE + "/robots.txt", "blocked_pages": blocked_by_robots, "error": robots_error},
        "limits": {
            "max_pages": args.max_pages,
            "truncated": truncated,
            "sleep_seconds": args.sleep,
            "time_budget_seconds": args.time_budget_seconds,
            "stopped_by": stopped_by,
            "elapsed_seconds": round(time.monotonic() - started, 3),
        },
        "safety": {
            "direct_avito_requests": 0,
            "avito_content_fetched": False,
            "only_alerteimmo_pages_fetched_for_listing_discovery": True,
        },
        "errors": errors,
        "exhaustive_claim": False,
    }
    (out / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8"
    )

    hashes = []
    for p in sorted(out.iterdir()):
        if p.name == "SHA256SUMS":
            continue
        hashes.append(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}")
    (out / "SHA256SUMS").write_text("\n".join(hashes) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
