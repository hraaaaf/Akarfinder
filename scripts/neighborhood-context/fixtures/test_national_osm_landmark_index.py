"""Tests for national OSM landmarks spatial index. No network, no PBF required."""
import importlib.util
import sqlite3
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
S=importlib.util.spec_from_file_location("national_landmarks",ROOT/"national-osm-landmark-index.py")
mod=importlib.util.module_from_spec(S)
S.loader.exec_module(mod)

class SpatialIndexTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.path=Path(self.tmp.name)/"private.sqlite"
        self.db=sqlite3.connect(self.path)
        mod.create_schema(self.db)
        self.writer=mod.Writer(self.db)
    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()
    def finalize(self):
        self.writer.finish()
        with self.db:
            self.db.executemany("INSERT INTO metadata(key,value) VALUES (?,?)",{
                "schema":mod.INDEX_SCHEMA,"source":mod.SOURCE,"license":mod.LICENSE,
                "md5":"a"*32,"sha256":"b"*64,"publication_state":"PRIVATE_QA_ONLY","feature_count":str(sum(self.writer.counts.values()))
            }.items())
    def test_category_mapping(self):
        self.assertEqual(mod.category_for({"amenity":"pharmacy"}),"health")
        self.assertEqual(mod.category_for({"leisure":"park"}),"green_sport")
        self.assertEqual(mod.category_for({"railway":"tram_stop"}),"transport")
        self.assertIsNone(mod.category_for({"tourism":"hotel"}))
    def test_viewport_filter_and_truth_contract(self):
        self.writer.add("node/1","Parc","green_sport",33.58,-7.64,"osm_node")
        self.writer.add("way/2","École","education",33.59,-7.63,"osm_polygon_representative_point")
        self.writer.add("node/3","Pharmacie","health",33.58,-7.62,"osm_node")
        self.writer.add("node/4","Tram Rabat","transport",34.03,-6.83,"osm_node")
        self.finalize()
        x=mod.query(self.path,[-7.7,33.5,-7.6,33.7])
        self.assertEqual(x["schema"],mod.SCHEMA)
        self.assertEqual(x["label"],"Repères à proximité")
        self.assertEqual(len(x["features"]),3)
        self.assertEqual([f["properties"]["category"] for f in x["features"]],["education","green_sport","health"])
        self.assertEqual(x["features"][0]["properties"]["positionType"],"indicative-area-point")
        self.assertIsNone(x["features"][0]["properties"]["currentlyOpen"])
        self.assertFalse(x["officialNeighborhoodMembershipCertified"])
        self.assertEqual(len(mod.query(self.path,[-7,33.9,-6.5,34.2])["features"]),1)
    def test_invalid_coordinates_name_category_identity(self):
        for args in [
            ("node/0","Bad","health",33.58,-7.64,"osm_node"),
            ("node/1","","health",33.58,-7.64,"osm_node"),
            ("node/2","Bad","health",91,-7.64,"osm_node"),
            ("node/3","Bad","unknown",33.58,-7.64,"osm_node"),
        ]:
            self.assertFalse(self.writer.add(*args))
        self.assertEqual(self.writer.rejections["invalid_row"],4)
    def test_dedupe_only_same_osm_id(self):
        self.assertTrue(self.writer.add("node/1","Bus stop","transport",33.58,-7.64,"osm_node"))
        self.assertTrue(self.writer.add("node/2","Bus stop","transport",33.58,-7.64,"osm_node"))
        self.assertFalse(self.writer.add("node/1","Bus stop","transport",33.58,-7.64,"osm_node"))
        self.finalize()
        self.assertEqual(len(mod.query(self.path,[-8,33,-7,34])["features"]),2)
        self.assertEqual(self.writer.rejections["duplicate_exact_osm_id"],1)
    def test_fail_closed_untrusted_index(self):
        self.writer.add("node/1","Parc","green_sport",33.58,-7.64,"osm_node")
        self.writer.finish()
        with self.assertRaises(ValueError):
            mod.query(self.path,[-8,33,-7,34])
    def test_invalid_bbox_and_limit(self):
        for bbox in ([],[10,0,5,10],[0,-91,5,20],[0,0,float("nan"),1]):
            with self.assertRaises(ValueError):mod.bbox_valid(bbox)
        self.writer.add("node/1","Parc","green_sport",33.58,-7.64,"osm_node")
        self.finalize()
        with self.assertRaises(ValueError):mod.query(self.path,[-8,33,-7,34],1001)
    def test_md5_mismatch_never_produces_index(self):
        fake=Path(self.tmp.name)/"morocco.osm.pbf"
        md5=Path(self.tmp.name)/"morocco.osm.pbf.md5"
        fake.write_bytes(b"fake")
        md5.write_text("0"*32+"  morocco.osm.pbf")
        target=Path(self.tmp.name)/"new.sqlite"
        with self.assertRaisesRegex(ValueError,"Checksum mismatch"):
            mod.build(fake,md5,target,Path(self.tmp.name)/"report.json")
        self.assertFalse(target.exists())

if __name__=="__main__":
    unittest.main()
