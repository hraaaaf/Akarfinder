#!/usr/bin/env python3
"""Offline, source-only reviewer handoff for AkarParser V3.

PREPARE sees original HTML, SHA sidecars and review-queue IDs ONLY. It never
reads V3 predictions. Its source cards are inert UTF-8 text, not live HTML.
Reviewer labels are deliberately invalid placeholders until a human completes
them. No network, no Neon, no Git uploads, no claims of independent validation.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime
import hashlib
import html
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

FIELDS = ("title", "city", "district", "price_mad",
          "surface_total_m2", "property_type", "transaction_type")
NUMERIC = {"price_mad", "surface_total_m2"}
STATES = {"present", "absent", "uncertain"}
EVIDENCE = re.compile(r"^(?:S\d{4,5}|NOT_IN_SOURCE:.{8,}|SOURCE_CONFLICT:.{8,})$")
NO_EVIDENCE = {"REVIEW_REQUIRED", "UNKNOWN", "TBD", "AUTO"}
PLACEHOLDER_REVIEWERS = {"", "reviewer", "test", "auto", "machine", "unknown"}


def require_private(path: Path) -> Path:
    real = path.resolve()
    if path.is_symlink() or any((part / ".git").is_dir() for part in
                                (real.parent, *real.parents)):
        raise ValueError("PRIVATE_LOCATION_REQUIRED_OUTSIDE_GIT")
    return real


def jsonl(path: Path) -> list[dict]:
    values = []
    with path.open("r", encoding="utf-8") as stream:
        for line in stream:
            if line.strip():
                record = json.loads(line)
                if not isinstance(record, dict):
                    raise ValueError("JSONL_RECORD_NOT_OBJECT")
                values.append(record)
    return values


def norm_path(value: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("INVALID_RELATIVE_PATH")
    path = value.replace("\\", "/")
    if path.startswith("/") or re.match(r"^[A-Za-z]:", path) or any(
        part in ("", "..", ".") for part in path.split("/")
    ):
        raise ValueError("UNSAFE_RELATIVE_PATH")
    return path


def sidecar_file(root: Path, rel: str) -> Path:
    path = (root / norm_path(rel)).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError("PATH_ESCAPE")
    if path.suffix.lower() != ".html":
        raise ValueError("NOT_HTML_SOURCE")
    return path


def sha256(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def source_record(root: Path, relative: str, expected_sha: str | None = None) -> dict:
    file = sidecar_file(root, relative)
    if not file.is_file():
        raise FileNotFoundError(file)
    payload = file.read_bytes()
    digest = sha256(payload)
    meta = json.loads(Path(str(file) + ".meta.json").read_text(encoding="utf-8"))
    if digest != meta.get("html_sha256") or meta.get("http_status") != 200:
        raise ValueError("INVALID_CAPTURE_HASH_OR_HTTP_STATUS")
    if expected_sha is not None and digest != expected_sha:
        raise ValueError("PRIORITY_OR_ALERT_SHA_MISMATCH")
    url = meta.get("source_url", "")
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username:
        raise ValueError("INVALID_SOURCE_URL")
    return {
        "relative": norm_path(relative), "file": file,
        "sha": digest, "url": url,
        "portal": parsed.hostname.lower().removeprefix("www."),
        "fetched_at": meta.get("fetched_at", ""),
        "raw": payload,
    }


def source_lines(payload: bytes) -> list[str]:
    """Inert source excerpts, NEVER an inferred field or V3 prediction."""
    raw = payload.decode("utf-8", errors="replace")
    lines = ["SOURCE ONLY — NOT ANNOTATIONS OR PARSER PREDICTIONS",
             "Read the full original HTML if source excerpts omit a field.",
             "Evidence refs S0001, S0002, ... refer to lines of this card."]
    for match in re.finditer(r"<title(?:\s[^>]*)?>(.*?)</title\s*>", raw, flags=re.I | re.S):
        lines.append("HTML TITLE: " + html.unescape(re.sub(r"\s+", " ", match.group(1))).strip()[:900])
        break
    for tag in re.findall(r"<meta\b[^>]*>", raw[:150000], flags=re.I):
        prop = re.search(r"\b(?:name|property)\s*=\s*['\"]([^'\"]+)['\"]", tag, flags=re.I)
        content = re.search(r"\bcontent\s*=\s*['\"]([^'\"]*)['\"]", tag, flags=re.I)
        if prop and content and prop.group(1).lower() in ("og:title","og:description","description","twitter:title"):
            lines.append("HTML META " + prop.group(1) + ": " + html.unescape(content.group(1))[:1500])
    for match in re.finditer(r"<script\b([^>]*)>(.*?)</script\s*>", raw, flags=re.I | re.S):
        if re.search(r"application/ld\+json", match.group(1), flags=re.I):
            body = html.unescape(match.group(2))
            for segment in body[:22000].splitlines()[:200]:
                if segment.strip():
                    lines.append("ORIGINAL JSON-LD: " + segment.strip()[:1200])
    safe = re.sub(r"<!--.*?-->", " ", raw[:1_000_000], flags=re.S)
    safe = re.sub(r"<(?:script|style|svg|noscript|template)\b[^>]*>.*?</(?:script|style|svg|noscript|template)\s*>",
                  " ", safe, flags=re.I | re.S)
    safe = re.sub(r"</?(?:p|div|br|h[1-6]|li|td|tr|section|article|header|footer)\b[^>]*>",
                  "\n", safe, flags=re.I)
    safe = re.sub(r"<[^>]*>", " ", safe)
    visible = html.unescape(safe)
    visible = re.sub(r"[ \t]+", " ", visible)
    for item in visible.splitlines():
        clean = item.strip()
        if clean:
            lines.append("SOURCE TEXT: " + clean[:2000])
        if len(lines) >= 1900:
            lines.append("SOURCE EXCERPT TRUNCATED — consult original HTML")
            break
    return lines


def blank_label(record: dict, case_id: str, source_file: str) -> dict:
    return {
        "case_id": case_id,
        "source_file": source_file.replace("/", "\\"),
        "source_line": 1,
        "source_file_sha256": record["sha"],
        "source_url": record["url"],
        "portal": record["portal"],
        "reviewer_blind_to_parser": False,
        "reviewer_id": "",
        "reviewed_at": "",
        "permission_evidence_ref": "",
        "manual_review_complete": False,
        "fields": {field: {"state": "pending", "value": None, "evidence_ref": ""}
                   for field in FIELDS},
    }


def write_jsonl(path: Path, records: list[dict]) -> None:
    with path.open("x", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(record, sort_keys=True, ensure_ascii=False) + "\n")


def prepare(args) -> dict:
    originals = require_private(args.original_root)
    canonical = require_private(args.canonical_root)
    priority_path = require_private(args.priority)
    alerts_path = require_private(args.alerts)
    out = require_private(args.out)
    supervisor = require_private(args.supervisor_out)
    if out.exists() or supervisor.exists() or out == supervisor or out in supervisor.parents:
        raise FileExistsError("NO_OVERWRITE_OR_NESTED_SUPERVISOR")
    if not originals.is_dir() or not canonical.is_dir():
        raise ValueError("MISSING_PRIVATE_CAPTURE_ROOT")
    raw_original = sorted(p for p in originals.rglob("*.html"))
    if len(raw_original) != 100:
        raise ValueError("EXPECTED_EXACTLY_100_ORIGINAL_SOURCES")
    queue = jsonl(priority_path)
    alerts = jsonl(alerts_path)
    if len(queue) != 35 or len(alerts) != 21:
        raise ValueError("EXPECTED_35_PRIORITIES_AND_21_ALERTS")
    priority = {}
    for row in queue:
        rel = norm_path(row["source_file"])
        if rel in priority:
            raise ValueError("DUPLICATE_PRIORITY")
        if row.get("priority") not in ("P0", "P1"):
            raise ValueError("INVALID_PRIORITY")
        priority[rel] = row
    if Counter(v["priority"] for v in priority.values()) != Counter({"P0":8, "P1":27}):
        raise ValueError("PRIORITY_COUNTS_CHANGED")
    originals_read = []
    for file in raw_original:
        rel = file.relative_to(originals).as_posix()
        record = source_record(originals, rel,
                               priority[rel]["source_file_sha256"] if rel in priority else None)
        if rel in priority and record["url"] != priority[rel].get("source_url"):
            raise ValueError("PRIORITY_SOURCE_URL_MISMATCH")
        originals_read.append(record)
    if len({x["url"] for x in originals_read}) != 100:
        raise ValueError("DUPLICATE_ORIGINAL_SOURCE_URL")
    if len({x["sha"] for x in originals_read}) != 100:
        raise ValueError("DUPLICATE_ORIGINAL_SOURCE_HTML")
    if not set(priority).issubset({x["relative"] for x in originals_read}):
        raise ValueError("PRIORITY_REFERENCES_UNKNOWN_SOURCE")
    originals_read.sort(key=lambda x: (
        {"P0":0, "P1":1}.get(priority.get(x["relative"], {}).get("priority"), 2),
        x["relative"]))
    canary_read = []
    for row in alerts:
        rel = norm_path(row["canonical_page_file"])
        record = source_record(canonical, rel, row["html_sha256"])
        record["parser_rel"] = rel.removeprefix("pages/")
        if rel == record["parser_rel"]:
            raise ValueError("EXPECTED_PAGES_PREFIX")
        if record["url"] != row["source_url"]:
            raise ValueError("ALERT_URL_MISMATCH")
        canary_read.append(record)
    if len({x["relative"] for x in canary_read}) != 21:
        raise ValueError("DUPLICATE_ALERT_SOURCE")
    if len({x["sha"] for x in canary_read}) != 21:
        raise ValueError("DUPLICATE_CANARY_ALERT_HTML")
    sha_overlap = {x["sha"] for x in originals_read} & {x["sha"] for x in canary_read}

    prepared = []
    for prefix, records, source_type in (("O", originals_read, "original100"),
                                        ("C", canary_read, "canary21")):
        for i, record in enumerate(records, 1):
            case_id = prefix + f"{i:03d}"
            relative = record["relative"] if prefix == "O" else record["parser_rel"]
            label = blank_label(record, case_id, relative)
            prepared.append((source_type, record, label))
    temporary = out.with_name(out.name + ".tmp")
    if temporary.exists():
        raise FileExistsError("TEMPORARY_PACKET_ALREADY_EXISTS")
    temporary.mkdir(parents=True)
    labels = {"original100": [], "canary21": []}
    for source_type, record, label in prepared:
        case_id = label["case_id"]
        card = temporary/"source_cards"/(case_id+".txt")
        card.parent.mkdir(parents=True, exist_ok=True)
        start = [
            "CASE: " + case_id,
            "PORTAL: " + record["portal"],
            "SOURCE URL: " + record["url"],
            "CAPTURED_AT: " + str(record["fetched_at"]),
            "SHA256: " + record["sha"],
            "PRIVATE HTML: " + str(record["file"]),
        ]
        all_lines = start + source_lines(record["raw"])
        with card.open("x", encoding="utf-8") as output:
            for n, line in enumerate(all_lines, 1):
                output.write(f"S{n:04d} | {line}\n")
        labels[source_type].append(label)
    write_jsonl(temporary/"labels_original100_TEMPLATE.jsonl",labels["original100"])
    write_jsonl(temporary/"labels_canary21_TEMPLATE.jsonl",labels["canary21"])
    summary = {
        "original_html_sources_verified": len(originals_read),
        "original_priorities": {"P0":8, "P1":27, "other":65},
        "canary_alerts_verified": len(canary_read),
        "same_html_sha_shared_between_groups": len(sha_overlap),
        "unique_html_reviewer_cards_by_sha": len({r["sha"] for _,r,_ in prepared}),
        "source_cards_generated": len(prepared),
        "human_reviews_completed": 0,
        "machine_predictions_exposed_to_reviewer": False,
        "rights_confirmed": False,
        "no_db_writes": True,
    }
    (temporary/"summary.json").write_text(
        json.dumps(summary,indent=2,sort_keys=True),encoding="utf-8")
    (temporary/"REVIEWER_GUIDE.txt").write_text(
        "AKARPARSER V3 — REVUE HUMAINE À L'AVEUGLE (LOCAL UNIQUEMENT)\n"
        "1. Lire source_cards/O001.txt ... O100.txt dans l'ordre (35 prioritaires d'abord),"
        " puis C001 ... C021.\n"
        "2. Utiliser l'HTML original dans le chemin PRIVATE HTML si un extrait ne suffit pas."
        " Ne pas afficher les sorties V3, diagnostics superviseur ou prédictions.\n"
        "3. Copier les deux fichiers *_TEMPLATE.jsonl en deux nouveaux fichiers de réponses."
        " Ne jamais modifier le modèle original.\n"
        "4. Pour chaque champ, remplacer pending par present/absent/uncertain."
        " Pour present, donner value (prix MAD et surface m2 numériques) et evidence_ref Sxxxx."
        " Pour absent, mettre value null et NOT_IN_SOURCE:justification."
        " Pour uncertain, mettre value null et SOURCE_CONFLICT:justification.\n"
        "5. Renseigner reviewer_id personnel, reviewed_at ISO-8601, reviewer_blind_to_parser=true,"
        " manual_review_complete=true uniquement après lecture, et permission_evidence_ref"
        " uniquement avec référence réellement fournie par le responsable des droits.\n"
        "6. Valider avec le sous-programme validate, sans inventer de label ni d'autorisation."
        " Les valeurs source peuvent être incorrectes ou indisponibles aujourd'hui.\n"
        "7. Les 100 labels originaux complets peuvent ensuite être transmis au benchmark V3"
        " existant (qui conserve certified_for_production=false).\n",
        encoding="utf-8")
    supervisor.parent.mkdir(parents=True, exist_ok=True)
    supervisor.write_text(json.dumps({
        "only_for_supervisor_not_reviewer": True,
        "priority": {x["source_file"]: {
            "priority": x["priority"],
            "parser_review_reasons": x.get("parser_review_reasons", []),
        } for x in queue},
        "sha_shared_between_original_and_canary": sorted(sha_overlap),
        "source_labels_to_supervisor": {
            label["case_id"]: {"source_type":t,"source_file":label["source_file"]}
            for t,_,label in prepared
        },
    },ensure_ascii=False,indent=2),encoding="utf-8")
    temporary.rename(out)
    return summary


def validate(args) -> dict:
    packet = require_private(args.packet)
    paths = (packet/"labels_original100_TEMPLATE.jsonl",
             packet/"labels_canary21_TEMPLATE.jsonl")
    expected = [jsonl(p) for p in paths]
    actual_paths = (require_private(args.original_labels),
                    require_private(args.canary_labels))
    if any(actual==template.resolve() for actual,template in zip(actual_paths,paths)):
        raise ValueError("DO_NOT_VALIDATE_OR_MODIFY_TEMPLATE")
    result = {}
    for group, required, path in zip(("original100","canary21"), expected, actual_paths):
        labels = jsonl(path)
        if len(labels)!=len(required):
            raise ValueError("INCOMPLETE_LABEL_FILE:"+group)
        by_id={row.get("case_id"):row for row in labels}
        if len(by_id)!=len(labels) or set(by_id)!={r["case_id"] for r in required}:
            raise ValueError("CASE_LIST_MISMATCH:"+group)
        reviewers = Counter()
        for req in required:
            label = by_id[req["case_id"]]
            for key in ("case_id","source_file","source_line","source_file_sha256",
                        "source_url","portal"):
                if req[key]!=label.get(key):
                    raise ValueError("ANNOTATION_SOURCE_MISMATCH:"+key)
            if label.get("reviewer_blind_to_parser") is not True or label.get("manual_review_complete") is not True:
                raise ValueError("HUMAN_BLIND_REVIEW_NOT_DECLARED")
            reviewer=label.get("reviewer_id")
            if not isinstance(reviewer,str) or reviewer.strip().lower() in PLACEHOLDER_REVIEWERS:
                raise ValueError("INVALID_REVIEWER_ID")
            if not isinstance(label.get("permission_evidence_ref"),str) or not label["permission_evidence_ref"].strip():
                raise ValueError("MISSING_RESPONSIBLE_PERMISSION_REF")
            try:
                date=datetime.fromisoformat(str(label.get("reviewed_at", "")).replace("Z","+00:00"))
            except ValueError as ex:
                raise ValueError("INVALID_REVIEWED_AT") from ex
            if date.tzinfo is None:
                raise ValueError("REVIEWED_AT_REQUIRES_TIMEZONE")
            fields=label.get("fields")
            if not isinstance(fields,dict) or set(fields)!=set(FIELDS):
                raise ValueError("SEVEN_CORE_FIELDS_REQUIRED")
            card=packet/"source_cards"/(label["case_id"]+".txt")
            card_lines=card.read_text("utf-8").splitlines()
            line_limit=len(card_lines)
            for name,record in fields.items():
                if not isinstance(record,dict) or record.get("state") not in STATES:
                    raise ValueError("UNREVIEWED_FIELD:"+name)
                state,value,evidence=record["state"],record.get("value"),record.get("evidence_ref")
                if not isinstance(evidence,str) or not EVIDENCE.fullmatch(evidence):
                    raise ValueError("EVIDENCE_REQUIRED:"+name)
                if evidence.startswith("S"):
                    source_line=int(evidence[1:])
                    if source_line > line_limit or source_line < 1:
                        raise ValueError("EVIDENCE_OUTSIDE_SOURCE_CARD")
                    source_text=card_lines[source_line-1].split(" | ",1)[-1]
                    if not source_text.startswith((
                        "HTML TITLE:", "HTML META ", "ORIGINAL JSON-LD:",
                        "SOURCE TEXT:",
                    )):
                        raise ValueError("EVIDENCE_MUST_CITE_SOURCE_CONTENT")
                if state == "present":
                    if not evidence.startswith("S"):
                        raise ValueError("PRESENT_MUST_CITE_SOURCE_LINE:"+name)
                    if name in NUMERIC:
                        if isinstance(value,bool) or not isinstance(value,(int,float)) or value<=0 or value>1e12:
                            raise ValueError("INVALID_NUMERIC_LABEL:"+name)
                    elif not isinstance(value,str) or not value.strip():
                        raise ValueError("INVALID_TEXT_LABEL:"+name)
                    elif name == "transaction_type" and value not in ("sale","rent"):
                        raise ValueError("UNSUPPORTED_TRANSACTION_LABEL")
                elif value is not None:
                    raise ValueError("NON_PRESENT_VALUE_MUST_BE_NULL:"+name)
            reviewers[reviewer.strip()]+=1
        result[group]={"validated_declared_human_labels":len(labels),
                       "reviewers":dict(reviewers)}
    result["human_independence_independently_verified"]=False
    result["rights_independently_verified"]=False
    result["certified_for_production"]=False
    return result


def main() -> None:
    parser=argparse.ArgumentParser(description="Private blind review handoff, no external services")
    sub=parser.add_subparsers(dest="command",required=True)
    p=sub.add_parser("prepare")
    for name in ("original-root","canonical-root","priority","alerts","out","supervisor-out"):
        p.add_argument("--"+name,type=Path,required=True)
    q=sub.add_parser("validate")
    for name in ("packet","original-labels","canary-labels"):
        q.add_argument("--"+name,type=Path,required=True)
    args=parser.parse_args()
    result=prepare(args) if args.command=="prepare" else validate(args)
    print(json.dumps(result,sort_keys=True,ensure_ascii=False))


if __name__=="__main__":
    main()
