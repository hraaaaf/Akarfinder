"""V3 raw batch contracts: synthetic source pages only; never publish data."""
import csv
from datetime import datetime, timezone
import gzip
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import akarparser_v3_raw_bulk as m

NOW = datetime(2026, 11, 9, 12, 0, tzinfo=timezone.utc)


def raw(i=1, date="2026-11-08T12:00:00Z", *, with_district=True):
    return {
        "source_url": f"https://www.example-realestate.ma/listing/{i}",
        "title": "Vente appartement",
        "city": "Casablanca",
        "district": "Maârif" if with_district else None,
        "property_type": "apartment",
        "transaction_type": "sale",
        "price_mad": 1250000,
        "surface_m2": 95,
        "description": "Appartement lumineux, ascenseur et terrasse",
        "observed_at": date,
        "bedrooms": 2,
    }


HTML = """<!doctype html><html><head>
<title>Vente Appartement - Agdal</title>
<link rel="canonical" href="https://www.example-realestate.ma/listing/77">
<meta name="description" content="Appartement avec garage, terrasse et ascenseur">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Apartment","name":"Vente Appartement Agdal",
"description":"Appartement avec garage et ascenseur",
"address":{"@type":"PostalAddress","addressLocality":"Rabat","addressNeighborhood":"Agdal"},
"offers":{"@type":"Offer","price":1450000,"priceCurrency":"MAD"},
"floorSize":{"@type":"QuantitativeValue","value":115,"unitCode":"MTK"}}
</script></head>
<body><h1>Vente Appartement Agdal</h1><div>Ville: Rabat</div>
<div>Quartier: Agdal</div><p>Prix: 1 450 000 DH</p>
<p>Surface 115 m², 3 chambres, ascenseur et garage.</p></body></html>"""


class TestV3(unittest.TestCase):
    def test_structured_ready_score_and_rights_gate(self):
        obj = m.parse_raw(raw(), NOW)
        self.assertEqual(obj["quality"]["status"], "ready_internal")
        self.assertGreaterEqual(obj["quality"]["score"], 80)
        self.assertFalse(obj["quality"]["neon_product_admission_authorized"])
        self.assertFalse(obj["quality"]["freshness_independently_verified"])
        self.assertEqual(obj["fields"]["price_mad"], 1250000.0)
        self.assertEqual(obj["fields"]["district"], "Maârif")
        self.assertEqual(sum(obj["quality"]["score_breakdown"].values()), obj["quality"]["score"])

    def test_html_jsonld_nested_and_lexical(self):
        obj = m.parse_raw({"raw_html": HTML, "fetched_at": "2026-11-08T12:00:00Z"}, NOW)
        self.assertEqual(obj["fields"]["city"], "Rabat")
        self.assertEqual(obj["fields"]["district"], "Agdal")
        self.assertEqual(obj["fields"]["price_mad"], 1450000.0)
        self.assertEqual(obj["fields"]["surface_total_m2"], 115.0)
        self.assertEqual(obj["quality"]["status"], "ready_internal")
        self.assertIn("city", obj["field_evidence"])
        self.assertFalse(obj["quality"]["neon_product_admission_authorized"])

    def test_html_plain_text_with_explicit_units(self):
        text = """<html><head><title>Vente villa à Rabat</title></head><body>
        <p>Ville: Rabat</p><p>Quartier: Souissi</p><p>Prix 3 200 000 DH</p>
        <p>Superficie 350 m²</p><p>Villa avec jardin et garage.</p></body></html>"""
        rec = m.parse_raw({"raw_html": text, "source_url": "https://example.ma/villa/1",
                           "fetched_at": "2026-11-08T12:00:00Z"}, NOW)
        self.assertEqual(rec["fields"]["price_mad"], 3200000)
        self.assertEqual(rec["fields"]["surface_total_m2"], 350)
        self.assertEqual(rec["fields"]["city"], "Rabat")
        self.assertEqual(rec["fields"]["district"], "Souissi")

    def test_no_unsupported_currency_conversion(self):
        x = raw()
        del x["price_mad"]
        x["price"] = "180000"
        x["price_currency"] = "EUR"
        rec = m.parse_raw(x, NOW)
        self.assertIsNone(rec["fields"]["price_mad"])
        self.assertNotEqual(rec["quality"]["status"], "ready_internal")

    def test_no_auto_freshness_for_missing_or_old(self):
        x = raw()
        x.pop("observed_at")
        self.assertEqual(m.parse_raw(x, NOW)["quality"]["freshness_status"], "unproven")
        self.assertNotEqual(m.parse_raw(x, NOW)["quality"]["status"], "ready_internal")
        y = raw(date="2026-06-01T00:00:00Z")
        self.assertEqual(m.parse_raw(y, NOW)["quality"]["status"], "complete_requires_freshness")

    def test_future_timestamp_quarantine(self):
        x = raw(date="2027-12-01T12:00:00Z")
        self.assertEqual(m.parse_raw(x, NOW)["quality"]["status"], "quarantine")

    def test_incomplete_district_is_not_ready(self):
        x = raw(with_district=False)
        rec = m.parse_raw(x, NOW)
        self.assertIn("district", rec["quality"]["missing_fields"])
        self.assertEqual(rec["quality"]["status"], "partial")

    def test_real_filename_html_and_jsonl_gz_bulk(self):
        with tempfile.TemporaryDirectory() as tmp:
            b = Path(tmp)
            inbox = b / "inbox"
            inbox.mkdir()
            (inbox / "property.html").write_text(HTML, encoding="utf-8")
            with gzip.open(inbox / "batch.jsonl.gz", "wt", encoding="utf-8") as f:
                for n in range(1, 11):
                    f.write(json.dumps(raw(n)) + "\n")
            out = b / "output"
            report = m.run(inbox, out, as_of=NOW)
            self.assertEqual(report["input_count"], 11)
            self.assertEqual(report["status_counts"]["ready_internal"], 10)
            self.assertEqual(report["status_counts"]["complete_requires_freshness"], 1)  # HTML has no verified capture timestamp
            self.assertTrue((out / "aggregate_report.json").exists())
            self.assertFalse(report["safety"]["neon_admission_authorized"])

    def test_duplicate_url_quarantine(self):
        with tempfile.TemporaryDirectory() as tmp:
            b = Path(tmp)
            p = b / "input.jsonl"
            p.write_text(json.dumps(raw(1)) + "\n" + json.dumps(raw(1)) + "\n", encoding="utf-8")
            report = m.run(p, b / "out", as_of=NOW)
            self.assertEqual(report["status_counts"]["duplicate_urls"], 1)
            self.assertEqual(report["status_counts"]["quarantine"], 1)

    def test_invalid_row_isolated(self):
        with tempfile.TemporaryDirectory() as tmp:
            b = Path(tmp)
            p = b / "broken.jsonl"
            p.write_text(json.dumps(raw()) + "\n{broken-json\n", encoding="utf-8")
            report = m.run(p, b / "out", as_of=NOW)
            self.assertEqual(report["input_count"], 2)
            self.assertEqual(report["status_counts"]["errors"], 1)

    def test_csv_and_json_list(self):
        with tempfile.TemporaryDirectory() as tmp:
            b = Path(tmp)
            inp = b / "in"
            inp.mkdir()
            with (inp / "one.csv").open("w", encoding="utf-8", newline="") as f:
                w = csv.DictWriter(f, fieldnames=list(raw().keys()))
                w.writeheader()
                w.writerow(raw())
            (inp / "two.json").write_text(json.dumps([raw(2)]), encoding="utf-8")
            report = m.run(inp, b / "out", as_of=NOW)
            self.assertEqual(report["input_count"], 2)

    def test_bulk_10_100_1000_and_reproducibility(self):
        with tempfile.TemporaryDirectory() as tmp:
            b = Path(tmp)
            p = b / "1000.jsonl"
            with p.open("w", encoding="utf-8") as f:
                for i in range(1000):
                    f.write(json.dumps(raw(i + 100)) + "\n")
            for n in (10, 100, 1000):
                report = m.run(p, b / f"out{n}", as_of=NOW, limit=n)
                self.assertEqual(report["input_count"], n)
                self.assertEqual(report["status_counts"]["ready_internal"], n)
                self.assertEqual(report["field_presence_not_accuracy"]["price_mad"], n)
                self.assertEqual(report["field_presence_not_accuracy"]["district"], n)
            first = m.run(p, b / "repeat", as_of=NOW, limit=1000)
            self.assertEqual(report["output_sha256"], first["output_sha256"])

    def test_html_sidecar_capture_timestamp_and_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            b = Path(tmp)
            inp = b / "raw"
            inp.mkdir()
            html = inp / "property.html"
            html.write_text(HTML, encoding="utf-8")
            (inp / "property.html.meta.json").write_text(json.dumps({
                "fetched_at": "2026-11-08T12:00:00Z",
                "html_sha256": m.sha_file(html),
                "http_status": 200,
            }), encoding="utf-8")
            result = m.run(inp, b / "out", as_of=NOW)
            self.assertEqual(result["input_count"], 1)
            self.assertEqual(result["status_counts"]["ready_internal"], 1)
            self.assertFalse(result["safety"]["neon_admission_authorized"])

    def test_bad_html_capture_hash_rejected_not_repaired(self):
        with tempfile.TemporaryDirectory() as tmp:
            b = Path(tmp)
            inp = b / "raw"
            inp.mkdir()
            (inp / "page.html").write_text(HTML, encoding="utf-8")
            (inp / "page.html.meta.json").write_text(json.dumps({
                "fetched_at": "2026-11-08T12:00:00Z", "html_sha256": "0" * 64,
            }), encoding="utf-8")
            result = m.run(inp, b / "out", as_of=NOW)
            self.assertEqual(result["status_counts"]["errors"], 1)
            self.assertEqual(result["status_counts"].get("ready_internal", 0), 0)

    def test_nested_json_fields_without_title_guess(self):
        rec = {
            "listing": {
                "source_url": "https://example.ma/listing/202",
                "title": "Vente villa",
                "property_type": "villa", "transaction_type": "sale",
                "address": {"addressLocality": "Marrakech", "addressNeighborhood": "Guéliz"},
                "offers": {"price": 2200000, "priceCurrency": "MAD"},
                "floorSize": {"value": 145, "unitCode": "MTK"},
                "description": "Villa moderne à vendre avec garage",
            },
            "captured_at": "2026-11-08T12:00:00Z",
        }
        parsed = m.parse_raw(rec, NOW)
        self.assertEqual(parsed["fields"]["city"], "Marrakech")
        self.assertEqual(parsed["fields"]["district"], "Guéliz")
        self.assertEqual(parsed["fields"]["price_mad"], 2200000)
        self.assertEqual(parsed["fields"]["surface_total_m2"], 145)
        self.assertEqual(parsed["quality"]["status"], "ready_internal")

    def test_no_sqft_as_m2(self):
        rec = raw(36)
        del rec["surface_m2"]
        rec["floorSize"] = {"value": 1200, "unitCode": "FTK"}
        got = m.parse_raw(rec, NOW)
        self.assertIsNone(got["fields"]["surface_total_m2"])
        self.assertNotEqual(got["quality"]["status"], "ready_internal")
        other = raw(37)
        other["surface_m2"] = {"value": 1200, "unitCode": "FTK"}
        got2 = m.parse_raw(other, NOW)
        self.assertIsNone(got2["fields"]["surface_total_m2"])

    def test_explicit_farm_remains_farm(self):
        rec = raw(51)
        rec["property_type"] = "farm"
        result = m.parse_raw(rec, NOW)
        self.assertEqual(result["fields"]["property_type"], "farm")
        self.assertFalse(result["quality"]["neon_product_admission_authorized"])

    def test_images_and_bedroom_text(self):
        content = HTML.replace('3 chambres, ascenseur', '4 chambres, ascenseur')
        item = m.parse_raw({"raw_html": content, "fetched_at": "2026-11-08T12:00:00Z",
                            "images": ["https://example.ma/photo1.jpg", "https://example.ma/photo2.jpg"]}, NOW)
        self.assertEqual(item["fields"]["bedrooms_count"], 4)
        self.assertEqual(len(item["fields"]["image_urls"]), 2)

    def test_output_inside_input_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            b = Path(tmp)
            (b / "input.jsonl").write_text(json.dumps(raw()), encoding="utf-8")
            with self.assertRaises(ValueError):
                m.run(b, b / "results", as_of=NOW)


if __name__ == "__main__":
    unittest.main()
