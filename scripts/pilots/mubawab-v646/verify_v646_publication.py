#!/usr/bin/env python3
"""Read-only authenticated snapshot reader (no network, no mutations).

Never verify a path and reopen the file later: read the verified bytes from the
snapshot in this same call, or use read_verified_publication() from Python.
"""
import argparse
import json
import sys
from pathlib import Path
from akarfinder_scraper import (PUBLICATION_FILES, read_verified_publication,
                                verify_publication, PublicationVerificationError)


def main() -> int:
    parser = argparse.ArgumentParser(description="V646 publication authenticity and verified-byte reader")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--read-export", choices=PUBLICATION_FILES,
                        help="Emit verified immutable bytes directly to stdout (no post-check reopen)")
    args = parser.parse_args()
    if args.read_export:
        try:
            with read_verified_publication(args.root) as pub:
                sys.stdout.buffer.write(pub.read_export(args.read_export))
            return 0
        except (PublicationVerificationError, OSError, ValueError, TypeError) as exc:
            print(f"Verified read denied: {type(exc).__name__}", file=sys.stderr)
            return 1
    result = verify_publication(args.root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
