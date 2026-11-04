#!/usr/bin/env python3
"""Run exactly the 3 approved V646 page-1 canaries, sequentially, without retries.

Run from a real checkout with network and ordinary Playwright Chromium available.
The subprocess live_canary.py owns fresh robots checks and every HTTP/navigation gate.
No proxies, IP rotation, pagination, detail pages, images or DB writes are introduced.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys

SHARDS = (
    ("rabat", "https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre"),
    ("casablanca-maarif", "https://www.mubawab.ma/fr/sd/casablanca/ma%C3%A2rif/appartements-a-vendre"),
    ("agadir-hay-salam", "https://www.mubawab.ma/fr/sd/agadir/hay-salam/appartements-a-vendre"),
)


def run(root: Path, output: Path, *, check_only: bool = False, invoke=subprocess.run) -> dict:
    """A failure stops every later shard. Includes failed JSON/logs in output directory."""
    root = root.resolve()
    output = output.resolve()
    started = datetime.now(timezone.utc).isoformat(timespec="seconds")
    summary = {
        "mode": "V646_THREE_PAGE_LIVE_CANARY",
        "started_at_utc": started,
        "real_network_attempted": False,
        "calibration_cadence_verified": False,
        "production_db_writes": 0,
        "status": "NOT_STARTED",
        "shards": [],
        "stop_reason": None,
    }
    output.mkdir(parents=True, exist_ok=True)

    def save():
        (output / "batch-summary.json").write_text(
            json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

    try:
        manifest = root / "pilot-urls.txt"
        source = root / "live_canary.py"
        if not source.is_file() or not manifest.is_file():
            raise RuntimeError("Requires an actual V646 checkout with live_canary.py and pilot-urls.txt")
        urls = [s.strip() for s in manifest.read_text(encoding="utf-8").splitlines()
                if s.strip() and not s.lstrip().startswith("#")]
        if urls != [url for _, url in SHARDS]:
            raise RuntimeError("Unapproved or reordered shard manifest; no navigation allowed")
        rev = invoke(["git", "rev-parse", "HEAD"], cwd=root, capture_output=True, text=True)
        if rev.returncode != 0 or len(rev.stdout.strip()) != 40:
            raise RuntimeError("Cannot establish Git HEAD provenance; no navigation allowed")
        summary["source_head"] = rev.stdout.strip()
        if check_only:
            summary["status"] = "CHECK_ONLY_NO_SITE_REQUESTS"
            return summary
        tests = invoke([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
                       cwd=root, capture_output=True, text=True)
        (output / "offline-tests.log").write_text(
            (tests.stdout or "") + "\n" + (tests.stderr or ""), encoding="utf-8"
        )
        summary["offline_tests_exit_code"] = tests.returncode
        if tests.returncode != 0:
            raise RuntimeError("Offline tests failed; no site request permitted")
        for name, url in SHARDS:
            out = output / f"v646-post-p1-{name}.json"
            cmd = [sys.executable, str(source), "--url", url, "--output", str(out)]
            env = {**os.environ, "GITHUB_SHA": summary["source_head"]}
            summary["real_network_attempted"] = True
            step = invoke(cmd, cwd=root, env=env, capture_output=True, text=True)
            (output / f"v646-post-p1-{name}.log").write_text(
                (step.stdout or "") + "\n" + (step.stderr or ""), encoding="utf-8"
            )
            payload = None
            if out.is_file():
                try:
                    payload = json.loads(out.read_text(encoding="utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    pass
            analysis = (payload or {}).get("html_analysis") or {}
            accepted = (
                step.returncode == 0 and payload is not None
                and payload.get("canary_status") == "parsed_quality_pass"
                and payload.get("source_search_url") == url
                and payload.get("response_code") == 200
                and payload.get("attempts") == 1
                and payload.get("listing_page_navigations") == 1
                and payload.get("production_db_writes") == 0
                and payload.get("browser_proxies_or_challenge_bypass") is False
                and (payload.get("robots") or {}).get("status") == "checked"
                and analysis.get("quality_accepted") is True
                and (payload.get("provenance") or {}).get("github_sha") == summary["source_head"]
            )
            summary["shards"].append({
                "name": name, "source_url": url, "status": (payload or {}).get("canary_status", "NO_REPORT"),
                "response_code": (payload or {}).get("response_code"),
                "eligible_cards": analysis.get("eligible_cards"),
                "unique_source_ids": len(analysis.get("observed_source_ids") or []),
                "quality_accepted": analysis.get("quality_accepted"),
                "exit_code": step.returncode, "accepted": accepted,
                "json_filename": out.name if payload is not None else None,
            })
            if not accepted:
                summary["stop_reason"] = f"{name}: first failing gate; later shards not visited"
                summary["status"] = "STOPPED_FIRST_FAILURE"
                return summary
        summary["status"] = "THREE_SHARDS_PASSED"
        return summary
    except Exception as exc:
        summary["status"] = "PREFLIGHT_OR_OFFLINE_TESTS_FAILED"
        summary["stop_reason"] = f"{type(exc).__name__}: {exc}"
        return summary
    finally:
        save()


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--output", type=Path, default=Path("artifacts/v646-live-three-canaries"))
    p.add_argument("--check-only", action="store_true", help="Verify checkout and URL manifest; no network")
    args = p.parse_args()
    result = run(Path(__file__).resolve().parent, args.output, check_only=args.check_only)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["status"] in ("THREE_SHARDS_PASSED", "CHECK_ONLY_NO_SITE_REQUESTS") else 1


if __name__ == "__main__":
    raise SystemExit(main())