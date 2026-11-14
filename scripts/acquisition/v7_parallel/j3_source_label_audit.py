"""J3 offline, source-hero-only labels: NOT real-world geolocation/availability proof."""
from __future__ import annotations
import json
from pathlib import Path
import re
import sys
import unicodedata
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from v7_multisource.snapshot_evidence import offline_benchmark
from v7_parallel.j3_geo_qualification import qualify_geo_claim

FIELDS = ("title", "price_mad", "surface_total_m2", "city", "district",
          "property_type", "transaction_type")
IDS = ("444291", "445495", "420510", "387448", "500006")

def equivalent(field, actual, expected):
    if actual is None:
        return False
    if field in ("price_mad", "surface_total_m2"):
        return isinstance(actual, (float, int)) and not isinstance(actual, bool) and abs(actual-expected)<1e-8
    if field in ("city", "district") and isinstance(actual, str) and isinstance(expected, str):
        def normalized(s):
            s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
            return re.sub(r"\s+", " ", s.casefold()).strip()
        return normalized(actual) == normalized(expected)
    return actual == expected

def audit(label_path, private_root):
    data=json.loads(label_path.read_text(encoding="utf-8"))
    if data.get("schema_version") != "akar-v7-j3-source-visible-labels-v1":
        raise ValueError("LABEL_SCHEMA_INVALID")
    entries=data.get("records")
    if not isinstance(entries, list) or sorted(str(r.get("id")) for r in entries) != sorted(IDS):
        raise ValueError("SOURCE_IDS_INVALID")
    out={"source_html_sha256_verified":0,"independent_source_visible_labels":0,
         "parser_field_checks":0,"present_and_matching_source_hero_normalized":0,
         "parser_missing":[],"parser_incorrect_vs_source_hero":[],
         "normalization_only_differences":[], "unresolved_district_source_conflicts":[],
         "location_reality_verified":False,"availability_or_freshness_verified":False,
         "representative_accuracy_certified":False,"authorized_for_private_staging":False,
         "geo_conflict_quarantined_count":0,"geo_unverified_source_claim_count":0,
         "geo_publication_eligible_count":0,"geo_qualifications":[]}
    for entry in entries:
        id_=entry["id"]
        expected=entry["expected"]
        if set(expected)!=set(FIELDS) or not isinstance(entry.get("html_sha256"),str):
            raise ValueError("INCOMPLETE_INDEPENDENT_LABELS:"+id_)
        base=private_root/(".private-j3-"+id_)
        proof=offline_benchmark(base/"source.html",base/"source.manifest.json")
        if not proof["evidence_verified"] or proof["raw_sha256"] != entry["html_sha256"]:
            raise ValueError("ORIGINAL_BYTES_HASH_MISMATCH:"+id_)
        out["source_html_sha256_verified"]+=1
        if entry.get("district_description_conflict"):
            out["unresolved_district_source_conflicts"].append(
                {"id":id_,"hero_district":expected["district"],
                 "description_district":entry["district_description_conflict"]})
        geo=qualify_geo_claim(
            city_label=expected["city"], district_label=expected["district"],
            conflicting_description_district=entry["district_description_conflict"],
            sha256_verified=proof["evidence_verified"])
        out["geo_qualifications"].append({"id":id_, **geo})
        out["geo_conflict_quarantined_count"]+=int(geo["status"]=="source_internal_conflict")
        out["geo_unverified_source_claim_count"]+=int(geo["status"]=="source_claim_unverified")
        out["geo_publication_eligible_count"]+=int(geo["eligible_for_geo_publication"])
        for field in FIELDS:
            out["independent_source_visible_labels"]+=1
            values=proof["field_comparison"][field]
            for parser in ("l4","v3"):
                out["parser_field_checks"]+=1
                actual=values[parser]
                mismatch={"id":id_,"field":field,"parser":parser,
                          "source_label":expected[field],"extracted_value":actual}
                if actual is None:
                    out["parser_missing"].append(mismatch)
                elif equivalent(field,actual,expected[field]):
                    out["present_and_matching_source_hero_normalized"]+=1
                    if actual!=expected[field]:
                        out["normalization_only_differences"].append(mismatch)
                else:
                    out["parser_incorrect_vs_source_hero"].append(mismatch)
    return out

def main():
    label_path=Path(__file__).with_name("j3_independent_labels.json")
    result=audit(label_path,Path.cwd())
    print(json.dumps(result,ensure_ascii=False,sort_keys=True))
    return 1 if (result["parser_missing"] or result["parser_incorrect_vs_source_hero"]
                 or result["geo_publication_eligible_count"] != 0) else 0

if __name__=="__main__":
    raise SystemExit(main())
