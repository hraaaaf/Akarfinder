"""B02: real AkarParser V3 processing of 11 byte-exact audited candidate lines.
No network, no DB writes, no production promotion. Source listing metadata only.
"""
from __future__ import annotations
import gzip
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as v3

CASES = json.loads(r'''[["315001","RAK-GU-1325",3,"Marrakech","Guéliz",1499000,"apartment","turn667609view0","immo-marrakech/vente-appartements/gueliz/315001",100,"CRÉEZ VOTRE COCON FAMILIAL À GUÉLIZ",[]],["480565","RAK-GU-1347",2,"Marrakech","Camp Al Ghoul",1790000,"apartment","turn783928view3","immo-marrakech/vente-appartements/camp-al-ghoul/480565",96,"Appartmement de 96 m² à Camps Al Ghoul - Marrakech",[]],["265783","FES-AG-1097",2,"Fès","L'habitat",400000,"apartment","turn244836search1","immo-fes/vente-appartements/l-habitat/265783",73,"CRÉEZ UN ESPACE À VOTRE IMAGE",[]],["515431","FES-AG-1086",3,"Fès","Nouvelle Ville",1130000,"apartment","turn244836search2","immo-fes/vente-appartements/nouvelle-ville/515431",179,"CALME, VISIBILITÉ ET QUALITÉ DE VIE",[]],["915957","TNG-CH-1104",3,"Tanger","Sania",2100000,"apartment","turn199255search0","immo-tanger/vente-appartements/sania/915957",127,"Appartement de 127 m² à Sania malabata hills - Tanger",[]],["821813","BOU-BO-1057",2,"Bouskoura","Bouskoura",390000,"apartment","turn244836search8","immo-bouskoura/vente-appartements/bouskoura/821813",60,"UN ESPACE BIEN PENSÉ POUR SIMPLIFIER VOTRE QUOTIDIEN",[]],["816644","RBA-AG-1152",1,"Rabat","Agdal",1300000,"studio","turn321868search0","immo-rabat/vente-appartements/agdal/816644",37,"Studio à rénover - Agdal, à proximité des commodités",[]],["698235","RBA-AG-1151",5,"Rabat","Agdal",4500000,"apartment","turn321868search2","immo-rabat/vente-appartements/agdal/698235",332,"Élégant Appartement de 5 chambres à vendre à Agdal",[]],["388235","TNG-BN-1043",2,"Tanger",null,670000,"apartment","turn321868search4","immo-tanger/vente-appartements/ahlane/388235",80,"Appartement à vendre à Ahlane",["district_conflict:header_Ahlane_vs_description_Zemmouri_1"]],["413642","AGA-AG-1185",2,"Agadir","Hay Mohammadi",1100000,"apartment","turn398023search2","immo-agadir/vente-appartements/hay-mohammadi/413642",87,"Appartement 87 m², refait à neuf",[]],["649679","AGA-AG-1187",2,"Agadir","Hay Mohammadi",1600000,"apartment","turn398023search3","immo-agadir/vente-appartements/hay-mohammadi/649679",113,"Appartement lumineux,113 m² - Résidence avec piscine",[]]]''')
INPUT_SHA256 = "505e886f6222adf5dfbacd7a60982827284984a591d05a4ed33362e6fc82133d"
PREFIX = "https://agenz.ma/fr/annonces/"

def normalized():
    for sid, ref, bed, city, district, price, kind, proof, path, area, title, flags in CASES:
        yield dict(agency_reference=ref, bedrooms_count=bed, city=city,
            discovered_at="2026-11-12T15:21:14+00:00", district=district,
            price_currency="MAD", price_mad=price, property_type=kind,
            review_flags=flags, source_evidence_ref=proof, source_name="agenz.ma",
            source_offer_id=sid, source_url=PREFIX+path, surface_m2=area,
            title=title, transaction_type="sale")

class B02RealV3Canary(unittest.TestCase):
    def test_exact_input_and_real_v3_outputs(self):
        rows = list(normalized())
        self.assertEqual(len(rows), 11)
        text = "".join(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",",":"))+"\n" for row in rows)
        self.assertEqual(hashlib.sha256(text.encode("utf-8")).hexdigest(), INPUT_SHA256)
        with tempfile.TemporaryDirectory(prefix="b02-v3-") as tmp:
            root=Path(tmp)
            inp=root/"b02_v3_input_normalized.jsonl"
            inp.write_text(text, encoding="utf-8")
            out=root/"out"
            report=v3.run(inp, out, as_of=datetime(2026,11,12,15,21,14,tzinfo=timezone.utc))
            self.assertEqual(report["input_count"], 11)
            self.assertEqual(report["status_counts"].get("errors",0), 0)
            self.assertEqual(report["status_counts"].get("duplicate_urls",0), 0)
            self.assertEqual(report["input_files"][inp.name]["sha256"], INPUT_SHA256)
            self.assertEqual(report["safety"]["network_requests"], 0)
            self.assertEqual(report["safety"]["db_writes"], 0)
            self.assertFalse(report["safety"]["neon_admission_authorized"])
            with gzip.open(out/"all.jsonl.gz", "rt", encoding="utf-8") as stream:
                actual=[json.loads(line) for line in stream if line.strip()]
            self.assertEqual(len(actual),11)
            by_id={x["source"]["source_offer_id"]:x for x in actual}
            self.assertEqual(set(by_id), {x["source_offer_id"] for x in rows})
            for row in rows:
                entry=by_id[row["source_offer_id"]]
                self.assertEqual(entry["source"]["source_url"],row["source_url"])
                self.assertNotEqual(entry["source"]["identity_state"],"conflict")
                self.assertIsNone(entry["fields"].get("observed_at"))
                self.assertFalse(entry["quality"]["availability_verified"])
            self.assertIsNone(by_id["388235"]["fields"]["district"])
            scores=Counter(x["quality"]["status"] for x in actual)
            print("B02_V3_REAL_CANARY="+json.dumps({
                "input_sha256":INPUT_SHA256,
                "count":11, "statuses":dict(scores),
                "fields":report["field_presence_not_accuracy"],
                "sample":[{"id":sid, "score":by_id[sid]["quality"]["score"], "status":by_id[sid]["quality"]["status"], "price":by_id[sid]["fields"]["price_mad"]} for sid in ["315001","816644","388235"]],
                "db_writes":0, "network_requests":0, "errors":0
            },ensure_ascii=False,sort_keys=True),flush=True)
