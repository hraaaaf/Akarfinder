#!/usr/bin/env python3
"""Aggregate-only R0 reconciliation of a backup, GitHub manifest, and Neon export.

The script never executes backup SQL and never connects to Neon itself. Create
the Neon CSV inputs through the documented read-only COPY query, then pass
those local files. IDs and URLs are retained only in memory; output contains
aggregate counts only.
"""
from __future__ import annotations
import argparse, collections, csv, gzip, json, re, sqlite3, urllib.parse
from pathlib import Path

ID_LENGTH = {"avito": 8, "mubawab": 7}
COPY_RE = re.compile(rb"^COPY ([^ ]+) \(([^)]*)\) FROM stdin;")
BACKUP_TABLES = {
    "public.source_offer_seeds",
    "public.listing_sources",
    "public.mubawab_listing_corpus_v1",
}
NEON_COPY_SQL = """COPY (
SELECT lower(ls.source_name) AS source_name, ls.source_offer_key,
       ls.listing_url, ls.source_url, ls.last_seen_at, ls.is_active,
       ls.compliance_status, pl.city,
       (pl.title IS NOT NULL AND btrim(pl.title)<>'' AND pl.price_mad IS NOT NULL
        AND pl.city IS NOT NULL AND btrim(pl.city)<>'' AND pl.district IS NOT NULL
        AND btrim(pl.district)<>'' AND pl.surface_m2 IS NOT NULL) AS strict_complete
FROM public.listing_sources ls
JOIN public.property_listings pl ON pl.id=ls.property_listing_id
WHERE lower(ls.source_name) IN ('avito.ma','mubawab.ma')
) TO STDOUT WITH (FORMAT csv, HEADER true);"""

def normalize_source(value: str | None) -> str | None:
    value = (value or "").strip().lower()
    aliases = {
        "avito": "avito", "avito.ma": "avito", "www.avito.ma": "avito",
        "mubawab": "mubawab", "mubawab.ma": "mubawab", "www.mubawab.ma": "mubawab",
    }
    return aliases.get(value, value or None)

def final_url_id(url: str | None, source: str | None) -> str | None:
    if not url or source not in ID_LENGTH:
        return None
    path = urllib.parse.unquote(urllib.parse.urlsplit(url).path)
    found = re.findall(r"(?<!\d)\d{%d}(?!\d)" % ID_LENGTH[source], path)
    return found[-1] if found else None

def valid_key(value: str | None, source: str | None) -> str | None:
    value = (value or "").strip()
    if source in ID_LENGTH and value.isdigit() and len(value) == ID_LENGTH[source]:
        return value
    return None

def read_manifest(path: Path):
    conn = sqlite3.connect(f"file:{path.resolve().as_posix()}?mode=ro", uri=True)
    if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise ValueError("manifest SQLite integrity check failed")
    historical = collections.defaultdict(set)
    sample = collections.defaultdict(set)
    new_sample = collections.defaultdict(set)
    validation = collections.Counter()
    for source, source_id, canonical_url, is_history, is_sample in conn.execute(
        "SELECT source, source_id, canonical_url, historical_snapshot, recent_sample FROM candidates"
    ):
        source = normalize_source(source)
        source_id = str(source_id)
        if is_history:
            historical[source].add(source_id)
            validation[(source, "total")] += 1
            validation[(source, "matched")] += int(final_url_id(canonical_url, source) == source_id)
        if is_sample:
            sample[source].add(source_id)
        if is_sample and not is_history:
            new_sample[source].add(source_id)
    conn.close()
    return historical, sample, new_sample, validation

def read_backup(path: Path):
    result = collections.defaultdict(set)
    table = None
    columns = {}
    with gzip.open(path, "rb") as stream:
        for line in stream:
            if table is not None:
                if line.rstrip(b"\r\n") == b"\\.":
                    table = None
                    continue
                if table not in BACKUP_TABLES:
                    continue
                cells = line.rstrip(b"\r\n").split(b"\t")
                index = columns[table]
                def value(name):
                    pos = index.get(name)
                    if pos is None or pos >= len(cells) or cells[pos] == b"\\N":
                        return None
                    return cells[pos].decode("utf-8", "replace")
                if table == "public.source_offer_seeds":
                    source = normalize_source(value("source_domain"))
                    candidate = final_url_id(value("canonical_url"), source)
                    if candidate: result[source].add(candidate)
                elif table == "public.listing_sources":
                    source = normalize_source(value("source_name"))
                    candidate = valid_key(value("source_offer_key"), source)
                    if candidate: result[source].add(candidate)
                    for field in ("listing_url", "source_url"):
                        candidate = final_url_id(value(field), source)
                        if candidate: result[source].add(candidate)
                else:
                    source = normalize_source(value("source_domain"))
                    candidate = valid_key(value("source_listing_id"), source)
                    if candidate: result[source].add(candidate)
                    candidate = final_url_id(value("canonical_url"), source)
                    if candidate: result[source].add(candidate)
                continue
            match = COPY_RE.match(line)
            if match:
                table = match.group(1).decode("utf-8", "replace")
                if table in BACKUP_TABLES:
                    columns[table] = {
                        item.strip().decode("utf-8", "replace"): offset
                        for offset, item in enumerate(match.group(2).split(b","))
                    }
    return result

def load_canaries(paths):
    pages, all_ids = [], set()
    for path in paths:
        document = json.loads(path.read_text(encoding="utf-8"))
        values = document.get("html_analysis", {}).get("observed_source_ids", [])
        ids = {str(value) for value in values}
        pages.append({"evidence_file": path.name, "ids": ids})
        all_ids.update(ids)
    return pages, all_ids

def read_neon_export(path: Path):
    ids = collections.defaultdict(set)
    keys = collections.defaultdict(set)
    url_ids = collections.defaultdict(set)
    collisions = collections.defaultdict(int)
    completeness = collections.defaultdict(dict)
    with path.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            source = normalize_source(row.get("source_name"))
            if source not in ID_LENGTH:
                continue
            key = valid_key(row.get("source_offer_key"), source)
            url = final_url_id(row.get("listing_url"), source) or final_url_id(row.get("source_url"), source)
            if key: keys[source].add(key)
            if url: url_ids[source].add(url)
            if key and url and key != url: collisions[source] += 1
            for candidate in {item for item in (key, url) if item}:
                ids[source].add(candidate)
                old = completeness[source].get(candidate, False)
                completeness[source][candidate] = old or row.get("strict_complete", "").lower() in {"t", "true", "1"}
    return ids, keys, url_ids, collisions, completeness

def source_set_report(history, backup, neon, canary):
    union = history | backup | neon | canary
    return {
        "historical_ids": len(history), "backup_candidate_ids": len(backup),
        "neon_candidate_ids": len(neon), "canary_ids": len(canary),
        "distinct_references_union": len(union),
        "history_backup": len(history & backup), "history_neon": len(history & neon),
        "backup_neon": len(backup & neon), "history_backup_neon": len(history & backup & neon),
        "only_historical": len(history - (backup | neon | canary)),
        "only_backup": len(backup - (history | neon | canary)),
        "only_neon": len(neon - (history | backup | canary)),
        "only_canary": len(canary - (history | backup | neon)),
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backup-gz", type=Path, required=True)
    parser.add_argument("--historical-sqlite", type=Path, required=True)
    parser.add_argument("--neon-export", type=Path, required=True,
                        help="CSV emitted by the read-only NEON_COPY_SQL in this file")
    parser.add_argument("--canary-json", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    history, sample, sample_new, validation = read_manifest(args.historical_sqlite)
    backup = read_backup(args.backup_gz)
    pages, canary = load_canaries(args.canary_json)
    neon, key_ids, url_ids, collisions, complete = read_neon_export(args.neon_export)
    result = {
        "manifest_integrity": "ok",
        "validated_identity_spaces": {},
        "mubawab_v646_canary": {"distinct_ids": len(canary)},
        "limits": [
            "Raw IDs and URLs are held only in memory and omitted from output.",
            "This is a historical archive join; it does not prove activity, freshness, rights, or physical uniqueness.",
        ],
    }
    for source in ("avito", "mubawab"):
        report = source_set_report(history[source], backup[source], neon[source],
                                   canary if source == "mubawab" else set())
        report.update({
            "neon_key_ids": len(key_ids[source]),
            "neon_url_suffix_ids": len(url_ids[source]),
            "neon_key_url_disagreement_rows": collisions[source],
            "neon_deduplicated_complete_ids": sum(complete[source].values()),
            "historical_url_suffix_validation": {
                "matching": validation[(source, "matched")],
                "total": validation[(source, "total")],
            },
        })
        result["validated_identity_spaces"][source] = report
    result["mubawab_v646_canary"]["by_file"] = [
        {
            "evidence_file": page["evidence_file"],
            "ids": len(page["ids"]),
            "in_neon": len(page["ids"] & neon["mubawab"]),
            "in_backup": len(page["ids"] & backup["mubawab"]),
            "in_historical": len(page["ids"] & history["mubawab"]),
        }
        for page in pages
    ]
    result["historical_distinct_reference_union_validated_sources"] = sum(
        result["validated_identity_spaces"][source]["distinct_references_union"]
        for source in ("avito", "mubawab")
    )
    result["fresh_unique_eligible"] = None
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "union": result["historical_distinct_reference_union_validated_sources"]}))

if __name__ == "__main__":
    main()
