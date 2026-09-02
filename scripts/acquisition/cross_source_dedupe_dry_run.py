#!/usr/bin/env python3
import json
import pathlib
from cross_source_dedupe import cluster_records

ARTIFACT_DIR = pathlib.Path("artifacts/morocco-web-l5-dedupe")

records = [
    {"source_id":"mubawab","source_url":"https://www.mubawab.ma/fr/a/1001/appartement-agdal","external_offer_id":"1001","location.city":"Rabat","location.neighborhood":"Agdal","classification.property_type":"apartment","offer.transaction_type":"sale","surfaces.surface_total_m2":120,"offer.price_amount":1850000,"layout.bedrooms_count":3,"layout.bathrooms_count":2},
    {"source_id":"agency-a","source_url":"https://agency-a.ma/property/appartement-agdal-120m","location.city":"Rabat","location.neighborhood":"Agdal","classification.property_type":"apartment","offer.transaction_type":"sale","surfaces.surface_total_m2":122,"offer.price_amount":1820000,"layout.bedrooms_count":3,"layout.bathrooms_count":2},
    {"source_id":"marocannonces","source_url":"https://www.marocannonces.com/categorie/315/annonce/2002/appartement-maarif.html","external_offer_id":"2002","location.city":"Casablanca","location.neighborhood":"Maarif","classification.property_type":"apartment","offer.transaction_type":"sale","surfaces.surface_total_m2":95,"offer.price_amount":1400000,"layout.bedrooms_count":2,"layout.bathrooms_count":2},
    {"source_id":"agency-b","source_url":"https://agency-b.ma/property/appartement-maarif-95m","location.city":"Casablanca","location.neighborhood":"Maarif","classification.property_type":"apartment","offer.transaction_type":"sale","surfaces.surface_total_m2":96,"offer.price_amount":1430000,"layout.bedrooms_count":2,"layout.bathrooms_count":2},
    {"source_id":"agency-c","source_url":"https://agency-c.ma/property/villa-rabat","location.city":"Rabat","location.neighborhood":"Souissi","classification.property_type":"villa","offer.transaction_type":"sale","surfaces.surface_total_m2":500,"offer.price_amount":9500000,"layout.bedrooms_count":5,"layout.bathrooms_count":4},
    {"source_id":"agency-d","source_url":"https://agency-d.ma/property/villa-rabat-small","location.city":"Rabat","location.neighborhood":"Souissi","classification.property_type":"villa","offer.transaction_type":"sale","surfaces.surface_total_m2":250,"offer.price_amount":9200000,"layout.bedrooms_count":5,"layout.bathrooms_count":4},
]

out = cluster_records(records)
out["strategy"] = "bounded-fixture-cross-source-dedupe"
out["success"] = out["record_count"] == 6 and out["cluster_count"] == 4 and out["merged_cluster_count"] == 2 and out["singleton_count"] == 2 and out["zeroDbWrites"] is True
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
(ARTIFACT_DIR / "report.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
summary = [
    "# L5 Cross-Source Deduplication Dry-Run",
    "",
    f"- Records: {out['record_count']}",
    f"- Clusters: {out['cluster_count']}",
    f"- Merged clusters: {out['merged_cluster_count']}",
    f"- Singletons: {out['singleton_count']}",
    f"- zeroDbWrites: {str(out['zeroDbWrites']).lower()}",
    f"- success: {str(out['success']).lower()}",
]
(ARTIFACT_DIR / "report.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
print(json.dumps({k: out[k] for k in ["strategy","record_count","cluster_count","merged_cluster_count","singleton_count","zeroDbWrites","success"]}, indent=2))
raise SystemExit(0 if out["success"] else 1)
