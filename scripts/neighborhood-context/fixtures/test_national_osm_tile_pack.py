"""J11-B deterministic private pack tests; no live provider, product DB or Vercel."""
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "national-osm-tile-pack.py"
spec = importlib.util.spec_from_file_location("national_tile_pack", MODULE)
pack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack)


def fixture(path, *, bad_source=False):
    db = sqlite3.connect(path)
    db.execute("CREATE TABLE landmarks(osm_id TEXT, name TEXT, category TEXT, lon REAL, lat REAL, point_kind TEXT)")
    db.execute("CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
    rows = [
        ("node/101", "Ecole", "education", -7.631, 33.590, "osm_node"),
        ("way/22", "Parc", "green_sport", -7.625, 33.591, "osm_polygon_representative_point"),
        ("node/103", "Clinique", "health", -7.570, 33.610, "osm_node"),
        ("node/104", "Rabat", "shopping", -6.830, 34.020, "osm_node"),
        ("node/105", "Arrêt", "transport", -7.626, 33.590, "osm_node"),
    ]
    db.executemany("INSERT INTO landmarks VALUES (?,?,?,?,?,?)", rows)
    values = {"schema": pack.INDEX_SCHEMA,
              "source": pack.SOURCE if not bad_source else "unknown",
              "license": "ODbL-1.0", "publication_state": "PRIVATE_QA_ONLY",
              "geographic_scope": "whole-Morocco-not-district", "feature_count": str(len(rows)),
              "md5": "a" * 32, "sha256": "b" * 64}
    db.executemany("INSERT INTO metadata VALUES (?,?)", values.items())
    db.commit()
    db.close()


class NationalPackTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.index = self.root / "source.sqlite"
        self.out = self.root / "tiles"
        fixture(self.index)

    def tearDown(self):
        self.tmp.cleanup()

    def test_pack_count_reproducible_and_attribution(self):
        manifest = pack.build(self.index, self.out)
        self.assertEqual(manifest["featureCount"], 5)
        self.assertEqual(sum(t["count"] for t in manifest["tiles"].values()), 5)
        self.assertEqual(manifest["state"], "PRIVATE_QA_ONLY")
        self.assertFalse(manifest["businessOperatingStatusCertified"])
        self.assertFalse(manifest["officialNeighborhoodMembershipCertified"])
        with self.assertRaisesRegex(ValueError, "exists"):
            pack.build(self.index, self.out)
        other = self.root / "tiles-other"
        pack.build(self.index, other)
        self.assertEqual((self.out / "manifest.json").read_bytes(), (other / "manifest.json").read_bytes())

    def test_bounded_casablanca_and_rabat(self):
        pack.build(self.index, self.out)
        casa = pack.query(self.out, (-7.68, 33.55, -7.60, 33.64))
        self.assertEqual({v["properties"]["osmId"] for v in casa["features"]}, {"node/101", "way/22", "node/105"})
        self.assertEqual(casa["label"], "Repères à proximité")
        self.assertEqual({v["properties"]["currentlyOpen"] for v in casa["features"]}, {None})
        self.assertEqual({v["properties"]["officialQuarterMembership"] for v in casa["features"]}, {None})
        rabat = pack.query(self.out, (-6.85, 34.00, -6.80, 34.05))
        self.assertEqual(len(rabat["features"]), 1)
        self.assertEqual(rabat["features"][0]["properties"]["name"], "Rabat")

    def test_limit_and_large_viewport_fail_closed(self):
        pack.build(self.index, self.out)
        self.assertEqual(len(pack.query(self.out, (-7.68, 33.55, -7.60, 33.64), 1)["features"]), 1)
        with self.assertRaisesRegex(ValueError, "too large"):
            pack.query(self.out, (-17, 21, -1, 36))
        with self.assertRaises(ValueError):
            pack.query(self.out, (-7.68, 33.55, -7.60, 33.64), 0)
        with self.assertRaises(ValueError):
            pack.query(self.out, (-7.60, 33.55, -7.68, 33.64))

    def test_sha_corruption_rejected(self):
        manifest = pack.build(self.index, self.out)
        key = ":".join(map(str, pack.cell(-7.631, 33.590)))
        rel = manifest["tiles"][key]["path"]
        (self.out / rel).write_bytes(b"{}")
        with self.assertRaisesRegex(ValueError, "checksum"):
            pack.query(self.out, (-7.68, 33.55, -7.60, 33.64))

    def test_invalid_provenance_rejected_before_write(self):
        invalid = self.root / "invalid.sqlite"
        fixture(invalid, bad_source=True)
        with self.assertRaisesRegex(ValueError, "provenance"):
            pack.build(invalid, self.out)
        self.assertFalse(self.out.exists())

    def test_corrupt_feature_count_rejected(self):
        with sqlite3.connect(self.index) as db:
            db.execute("UPDATE metadata SET value='999' WHERE key='feature_count'")
        with self.assertRaisesRegex(ValueError, "count mismatch"):
            pack.build(self.index, self.out)
        self.assertFalse(self.out.exists())

    def test_malformed_osm_id_rejected_and_temp_cleaned(self):
        with sqlite3.connect(self.index) as db:
            db.execute("UPDATE landmarks SET osm_id='not/an/osm/id' WHERE osm_id='node/101'")
        with self.assertRaisesRegex(ValueError, "Invalid OSM ID"):
            pack.build(self.index, self.out)
        self.assertFalse(self.out.exists())
        self.assertFalse(self.root.joinpath("tiles.part").exists())


if __name__ == "__main__":
    unittest.main()
