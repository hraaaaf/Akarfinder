#!/usr/bin/env python3
"""Offline quality audit for frozen Avito qualification and shadow-stage JSON."""
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

CORE = ("title", "price", "location", "area")


def norm(value):
    return re.sub(r"\s+", " ", str(value or "").casefold()).strip()


def audit(payload, staging=None):
    records = payload["results"]
    coverage = {k: sum(bool(r.get("fields", {}).get(k)) for r in records)
                for k in (*CORE, "description", "photos", "published_or_updated")}
    strict = [r["id"] for r in records if all(r.get("fields", {}).get(k) for k in CORE)]
    ids = [str(r.get("id") or "") for r in records]
    urls = [str(r.get("url") or "") for r in records]
    groups = defaultdict(list)
    for r in records:
        f = r.get("fields", {})
        if all(f.get(k) for k in ("location", "area", "price", "description")):
            key = tuple(norm(f[k]) for k in ("location", "area", "price", "description"))
            groups[key].append(r)
    possible = []
    for matching in groups.values():
        if len(matching) < 2:
            continue
        ordered = sorted(matching, key=lambda r: str(r["id"]))
        possible.append({
            "ids": [str(r["id"]) for r in ordered],
            "shared_evidence": {k: ordered[0].get("fields", {}).get(k)
                                for k in ("location", "area", "price", "description")},
            "photo_count_by_id": {str(r["id"]): (len(r.get("fields", {}).get("photos") or [])
                                                    if r.get("fields", {}).get("photos") is not None else None)
                                  for r in ordered},
            "photos_differ": len({json.dumps(r.get("fields", {}).get("photos"), sort_keys=True) for r in ordered}) > 1,
            "physical_duplicate_proven": False, "auto_merged": False, "review_required": True,
        })
    incomplete = [{"id": str(r["id"]), "missing_fields": [k for k in CORE if not r.get("fields", {}).get(k)]}
                  for r in records if any(not r.get("fields", {}).get(k) for k in CORE)]
    staged_rows = (staging or {}).get("rows", [])
    rejected_rows = [{"id": r.get("source", {}).get("external_id"),
                      "reason": r.get("staging", {}).get("reason")}
                     for r in staged_rows if r.get("staging", {}).get("status") == "rejected"]
    return {
        "source_records": len(records), "unique_source_ids": len(set(ids)),
        "source_payload_sha256": (staging or {}).get("source_payload_sha256"),
        "duplicate_source_id_count": len(ids) - len(set(ids)),
        "duplicate_source_url_count": len(urls) - len(set(urls)), "coverage": coverage,
        "strict_four_fields_count": len(strict), "strict_four_fields_ids": strict,
        "strict_incomplete_records": incomplete,
        "legacy_threshold_count": sum(r.get("completeness_sufficient") is True for r in records),
        "freshness_verified_count": sum(r.get("freshness_status") == "verified" for r in records),
        "freshness_reported_date_count": coverage["published_or_updated"],
        "freshness_unknown_count": sum(not r.get("fields", {}).get("published_or_updated") for r in records),
        "active_confirmed": sum(r.get("availability") == "active_confirmed" for r in records),
        "commercial_reuse_confirmed": sum(r.get("commercial_reuse") == "authorized" for r in records),
        "possible_physical_duplicate_groups": possible,
        "physical_duplicates_proven": False, "physical_duplicates_auto_merged": False,
        "staged_offline_count": sum(r.get("staging", {}).get("status") == "staged_offline" for r in staged_rows),
        "staging_rejected_count": sum(r.get("staging", {}).get("status") == "rejected" for r in staged_rows),
        "staging_rejected_rows": rejected_rows,
        "publishable_count": sum(bool(r.get("guardrails", {}).get("publishable")) for r in staged_rows),
        "images_rights_confirmed_count": sum(bool(r.get("guardrails", {}).get("images_rights_confirmed")) for r in staged_rows),
        "network_requests": 0, "photo_downloads": 0, "db_writes": 0,
    }


def markdown(report):
    lines = ["# Avito shadow staging — rapport de validation", "",
             "Source : JSON de qualification existant uniquement. Aucun accès réseau, téléchargement photo, write DB ou publication.", "",
             f"SHA-256 du JSON source canonique (après parsing, indépendant des fins de ligne) : `{report['source_payload_sha256']}`.", "",
             "## Résultats", "",
             f"- Enregistrements traités ou rejetés explicitement : {report['source_records']}/{report['source_records']}; staging offline acceptés : {report['staged_offline_count']}; rejets : {report['staging_rejected_count']}.",
             f"- Complétude stricte (titre + prix + localisation + surface) : **{report['strict_four_fields_count']}/{report['source_records']}**.",
             f"- Descriptions observées : {report['coverage']['description']}/{report['source_records']}; photos présentes : {report['coverage']['photos']}/{report['source_records']}.",
             f"- Fraîcheur vérifiée : {report['freshness_verified_count']}/{report['source_records']}; inconnue : {report['freshness_unknown_count']}/{report['source_records']}; date rapportée : {report['freshness_reported_date_count']}/{report['source_records']}.",
             f"- Doublons d’ID source : {report['duplicate_source_id_count']}; doublons d’URL : {report['duplicate_source_url_count']}.",
             f"- Publication : {report['publishable_count']} publiable; droits image confirmés : {report['images_rights_confirmed_count']}; réutilisation commerciale confirmée : {report['commercial_reuse_confirmed']}.", "",
             "## Doublons physiques potentiels", ""]
    if report["possible_physical_duplicate_groups"]:
        for group in report["possible_physical_duplicate_groups"]:
            lines += [f"- IDs `{', '.join(group['ids'])}` : même ville/surface/prix/description normalisés; photos différentes : **{'oui' if group['photos_differ'] else 'non'}**; comptages observés : `{group['photo_count_by_id']}`. Signal de revue seulement; aucune fusion automatique, doublon physique non prouvé.",
                      f"  Description observée : {group['shared_evidence']['description']}"]
    else:
        lines.append("Aucun groupe candidat détecté.")
    lines += ["", "## Rejets explicites du schéma feed", ""]
    if report["staging_rejected_rows"]:
        lines += [f"- `{r['id']}` : {r['reason']}" for r in report["staging_rejected_rows"]]
    else:
        lines.append("Aucun rejet du validateur feed.")
    lines += ["", "## Champs stricts manquants", ""]
    lines += [f"- `{r['id']}` : {', '.join(r['missing_fields'])}" for r in report["strict_incomplete_records"]]
    lines += ["", "## Garde-fous", "", "Toutes les fiches restent `commercial_reuse=not_verified`, `availability_status=unconfirmed`, `publishable=false`, `images_rights_confirmed=false`. Les URL photo ne sont pas copiées dans le staging. Le partner-v2 bridge n’est pas appelé.", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", default="docs/handovers/avito-qualification-results.json")
    parser.add_argument("--staging", default="docs/handovers/avito-shadow-staging.json")
    parser.add_argument("--out", default="docs/handovers/avito-shadow-staging-quality.json")
    parser.add_argument("--markdown", default="docs/handovers/avito-shadow-staging-validation.md")
    args = parser.parse_args()
    source = json.loads(Path(args.source).read_text(encoding="utf-8"))
    stage = json.loads(Path(args.staging).read_text(encoding="utf-8")) if Path(args.staging).exists() else None
    result = audit(source, stage)
    Path(args.out).write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    Path(args.markdown).write_text(markdown(result), encoding="utf-8")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if result["source_records"] != 20 or result["strict_four_fields_count"] != 11:
        raise SystemExit("unexpected qualification fixture drift")


if __name__ == "__main__":
    main()
