#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import os
from pathlib import Path
from typing import Any

ROOT = Path(os.environ.get("CANDIDATE_LAKE_RAW", ".tmp/candidate-lake-inventory/raw"))
OUT = Path(os.environ.get("CANDIDATE_LAKE_OUT", ".tmp/candidate-lake-inventory/out"))
OUT.mkdir(parents=True, exist_ok=True)

TEXT_EXT = {".txt", ".csv", ".json", ".jsonl", ".ndjson", ".tsv", ".md"}
IDENTITY_HINTS = ("id", "ids", "url", "urls", "seed", "candidate", "manifest", "listing", "offer")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_text_lines(path: Path) -> tuple[int | None, int | None]:
    if path.suffix.lower() not in TEXT_EXT or path.stat().st_size > 100 * 1024 * 1024:
        return None, None
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None, None
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return len(lines), len(set(lines))


def json_summary(path: Path) -> dict[str, Any] | None:
    if path.suffix.lower() != ".json" or path.stat().st_size > 10 * 1024 * 1024:
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    interesting = {}
    for k, v in data.items():
        lk = k.lower()
        if any(t in lk for t in ("count", "total", "unique", "netnew", "net_new", "overlap", "candidate", "union", "write", "fetch", "readonly", "ids")):
            if isinstance(v, (str, int, float, bool)) or v is None:
                interesting[k] = v
    return interesting or None


rows: list[dict[str, Any]] = []
identity_candidates: list[dict[str, Any]] = []
artifact_stats: dict[str, dict[str, Any]] = {}

if not ROOT.exists():
    raise SystemExit(f"missing root: {ROOT}")

for artifact_dir in sorted(p for p in ROOT.iterdir() if p.is_dir()):
    aid = artifact_dir.name
    stats = {"artifactId": aid, "files": 0, "bytes": 0, "identityLikeFiles": 0}
    for path in sorted(p for p in artifact_dir.rglob("*") if p.is_file()):
        rel = path.relative_to(artifact_dir).as_posix()
        size = path.stat().st_size
        line_count, distinct_line_count = read_text_lines(path)
        js = json_summary(path)
        row = {
            "artifact_id": aid,
            "path": rel,
            "bytes": size,
            "sha256": sha256(path),
            "line_count": line_count,
            "distinct_line_count": distinct_line_count,
            "json_summary": json.dumps(js, ensure_ascii=False, sort_keys=True) if js else "",
        }
        rows.append(row)
        stats["files"] += 1
        stats["bytes"] += size

        name = path.name.lower()
        identity_like = any(h in name for h in IDENTITY_HINTS)
        if identity_like and line_count is not None:
            stats["identityLikeFiles"] += 1
            identity_candidates.append({
                "artifactId": aid,
                "path": rel,
                "lineCount": line_count,
                "distinctLineCount": distinct_line_count,
                "sha256": row["sha256"],
            })
    artifact_stats[aid] = stats

with (OUT / "files.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["artifact_id", "path", "bytes", "sha256", "line_count", "distinct_line_count", "json_summary"])
    writer.writeheader()
    writer.writerows(rows)

(OUT / "identity-candidates.json").write_text(
    json.dumps(identity_candidates, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8"
)

summary = {
    "generatedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    "artifactCount": len(artifact_stats),
    "fileCount": len(rows),
    "identityLikeFileCount": len(identity_candidates),
    "artifacts": list(artifact_stats.values()),
    "databaseWrites": 0,
    "sourceSiteFetches": 0,
    "productionWrites": 0,
    "readOnly": True,
    "purpose": "Q1 inventory only; no candidate union is claimed by this run",
}
(OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
