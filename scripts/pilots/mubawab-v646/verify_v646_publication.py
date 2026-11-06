#!/usr/bin/env python3
"""Fail-closed reader gate for local V646 publication (offline, read-only).

Consumers MUST verify before opening any akarfinder_* legacy top-level export.
"""
import argparse
import json
from pathlib import Path
from akarfinder_scraper import verify_publication


def main() -> int:
    p = argparse.ArgumentParser(description="Verify latest offline V646 outputs against publication SHA-256 marker")
    p.add_argument("--root", type=Path, default=Path("."))
    args = p.parse_args()
    result = verify_publication(args.root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
