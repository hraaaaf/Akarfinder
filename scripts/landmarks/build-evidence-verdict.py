#!/usr/bin/env python3
"""Build a fail-closed evidence manifest for Landmark Factory artifacts."""
import json
import os
from pathlib import Path

ART=Path("artifacts")

def load(name):
    p=ART/name
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"_parse_error":str(exc)}

def rel_count(name):
    d=load(name)
    return None if d is None else len(d.get("matches",[]))

def validation(name):
    d=load(name)
    if d is None:
        return {"present":False}
    return {
        "present":True,
        "ok":d.get("ok"),
        "publicationStatus":d.get("publicationStatus"),
        "reviewed":d.get("reviewed"),
        "issues":d.get("issues",[]),
    }

auc=load("auc-hay-hassani-arcgis-item.json")
yakeey=load("yakeey-public-map-inspection.json")
racine_product=load("racine-modern-product-candidate.json")

faces=(racine_product or {}).get("faces",[])
max_face=max((float(x.get("area_hectares") or 0) for x in faces), default=0)
authoritative_outputs=[
    "ain-diab-authoritative-boundary.geojson",
    "ain-diab-authoritative-boundary-snapped.geojson",
    "bourgogne-authoritative-boundary.geojson",
    "bourgogne-authoritative-boundary-snapped.geojson",
    "racine-authoritative-boundary.geojson",
    "racine-authoritative-boundary-snapped.geojson",
]
present_authoritative=[name for name in authoritative_outputs if (ART/name).exists()]

def source_control_context():
    github_context_sha=os.environ.get("GITHUB_SHA")
    pr_head_sha=None
    event_path=os.environ.get("GITHUB_EVENT_PATH")
    if event_path:
        try:
            event=json.loads(Path(event_path).read_text(encoding="utf-8"))
            pr_head_sha=((event.get("pull_request") or {}).get("head") or {}).get("sha")
        except Exception:
            pass
    return {
        "pr_head_sha":pr_head_sha or github_context_sha,
        "github_context_sha":github_context_sha,
        "event_name":os.environ.get("GITHUB_EVENT_NAME"),
        "ref":os.environ.get("GITHUB_REF"),
    }

manifest={
    "schema_version":2,
    "source_control":source_control_context(),
    "run_id":os.environ.get("GITHUB_RUN_ID"),
    "policy":{
        "auc_role":"urban-planning/historical truth",
        "yakeey_google_role":"modern real-estate product evidence",
        "osm_role":"geometry materialization substrate",
        "product_equals_auc_forbidden":True,
        "promotion_requires_independent_corroboration":True,
    },
    "auc_arcgis":{
        "artifact_present":auc is not None,
        "status":None if auc is None else auc.get("status"),
        "service_url_count":0 if auc is None else len(auc.get("arcgis_service_urls",[])),
        "geometry_claim":"none" if auc is None else auc.get("geometry_claim","none"),
    },
    "yakeey_public_probe":{
        "artifact_present":yakeey is not None,
        "status":"missing" if yakeey is None else yakeey.get("status","unknown"),
        "geometry_claim":"none" if yakeey is None else yakeey.get("geometry_claim","none"),
        "page_statuses":[] if yakeey is None else [
            {"page":p.get("page"),"status":p.get("status"),"http_status":p.get("http_status")}
            for p in yakeey.get("pages",[])
        ],
    },
    "osm_exact_boundary_relations":{
        "casablanca_finance_city":rel_count("cfc-boundary-relations.json"),
        "racine":rel_count("racine-boundary-relations.json"),
        "bourgogne":rel_count("bourgogne-boundary-relations.json"),
        "ain_diab":rel_count("ain-diab-boundary-relations.json"),
    },
    "racine_modern_product_candidate":{
        "artifact_present":racine_product is not None,
        "polygon_count":None if racine_product is None else racine_product.get("polygon_count"),
        "dangle_count":None if racine_product is None else racine_product.get("dangle_count"),
        "cut_count":None if racine_product is None else racine_product.get("cut_count"),
        "max_face_hectares":round(max_face,2),
        "verdict":"hold",
    },
    "authoritative_boundary_outputs":{
        "expected":authoritative_outputs,
        "present":present_authoritative,
        "count":len(present_authoritative),
        "verdict":"hold-unless-reviewed",
    },
    "materialized_admin_boundaries":{
        "bouskoura":validation("bouskoura-relation-2522564-validation.json"),
        "maarif":validation("casablanca-maarif-relation-2801474-validation.json"),
    },
    "promotion":{
        "allowed":False,
        "verdict":"NO_NEW_BOUNDARY",
        "reason":"Diagnostic success is not geometry certification; independent provenance/topology review remains required.",
    },
}
(ART/"landmark-factory-evidence-verdict.json").write_text(
    json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"
)
print(json.dumps(manifest,ensure_ascii=False,indent=2))
