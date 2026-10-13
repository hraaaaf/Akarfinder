import importlib.util,json,tempfile,unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/"build-national-v6-osm-provenance.py"
spec=importlib.util.spec_from_file_location("new_v6",p)
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
RING=[[0,0],[10,0],[10,10],[0,10],[0,0]]
SNAP={"pbfSha256":"0"*64}
def source(n,i,x=5,y=5,tag="suburb"):
    return {"type":"Feature","properties":{"@type":"node","@id":i,"name":n,"place":tag},"geometry":{"type":"Point","coordinates":[x,y]}}
def rel(n,i):
    return {"type":"Feature","properties":{"@type":"relation","@id":i,"boundary":"administrative","admin_level":"8","name":n},"geometry":{"type":"Polygon","coordinates":[RING]}}
class Tests(unittest.TestCase):
    def test_source_identity_tag_parent_and_hold(self):
        m,l,s=v.inspect([source("Boukhalef",1999241428)],[rel("Tanger",100)],SNAP)
        self.assertEqual(m["status"],"shadow_only_pass")
        self.assertEqual(s[0]["sourceIdentity"]["id"],"osm:node:1999241428")
        self.assertEqual(s[0]["sourceIdentity"]["placeTag"],"suburb")
        self.assertEqual(s[0]["parentProvenance"]["candidateRelations"][0]["relationId"],100)
        self.assertFalse(s[0]["review"]["mapEligible"])
    def test_multiple_parents_not_resolved_by_name(self):
        m,l,s=v.inspect([source("A",1)],[rel("A",100),rel("B",101)],SNAP)
        self.assertEqual(s[0]["parentProvenance"]["status"],"ambiguous_multiple")
    def test_distinct_ids_same_name_not_collapsed(self):
        m,l,s=v.inspect([source("Same",1),source("Same",2)],[rel("A",100)],SNAP)
        self.assertEqual(len(s),2)
    def test_orphan_parent_not_assigned(self):
        m,l,s=v.inspect([source("X",1,20,20)],[rel("A",100)],SNAP)
        self.assertEqual(s[0]["parentProvenance"]["status"],"none")
    def test_missing_name_preserved_in_ledger(self):
        a=source("X",1);a["properties"].pop("name")
        m,l,s=v.inspect([a],[rel("A",100)],SNAP)
        self.assertFalse(s);self.assertIn("missing_name",l[0]["reasons"])
    def test_missing_id_blocks_not_silently_dropped(self):
        m,l,s=v.inspect([source("X","bad")],[rel("A",100)],SNAP)
        self.assertEqual(m["status"],"blocked_integrity");self.assertEqual(len(l),1)
    def test_duplicate_id_blocks(self):
        m,l,s=v.inspect([source("X",1),source("Y",1)],[rel("A",100)],SNAP)
        self.assertFalse(m["safety"]["originalIdsUnique"])
    def test_unsupported_place_is_logged(self):
        m,l,s=v.inspect([source("X",1,tag="city")],[rel("A",100)],SNAP)
        self.assertIn("unsupported_place_tag",l[0]["reasons"]);self.assertFalse(s)
    def test_invalid_center_is_logged(self):
        a=source("X",1);a["geometry"]["coordinates"]=[None,None]
        m,l,s=v.inspect([a],[rel("A",100)],SNAP)
        self.assertIn("missing_center",l[0]["reasons"])
    def test_invalid_admin_id_blocks(self):
        m,l,s=v.inspect([source("X",1)],[rel("A","bad")],SNAP)
        self.assertEqual(m["status"],"blocked_integrity")
    def test_hole_is_not_parent(self):
        a=rel("A",100);a["geometry"]["coordinates"]=[RING,[[2,2],[8,2],[8,8],[2,8],[2,2]]]
        m,l,s=v.inspect([source("X",1)],[a],SNAP)
        self.assertEqual(s[0]["parentProvenance"]["status"],"none")
    def test_deterministic(self):
        x=[source("B",1),source("A",2)]
        self.assertEqual(v.encoded(v.inspect(x,[rel("A",100)],SNAP)),v.encoded(v.inspect(x,[rel("A",100)],SNAP)))
    def test_file_manifest_and_sha(self):
        with tempfile.TemporaryDirectory() as d:
            d=Path(d);(d/"pbf").write_bytes(b"new")
            (d/"n.json").write_text(json.dumps({"type":"FeatureCollection","features":[source("X",1)]}))
            (d/"a.json").write_text(json.dumps({"type":"FeatureCollection","features":[rel("A",100)]}))
            m=v.main(["--pbf",str(d/"pbf"),"--neighborhoods",str(d/"n.json"),"--boundaries",str(d/"a.json"),"--output",str(d/"out"),"--downloaded-at","2026-10-13T12:00:00Z"])
            self.assertEqual(m["counts"]["input"],m["counts"]["ledger"])
            self.assertIn("ledgerSha256",m)
    def test_invalid_geojson_blocks(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"bad.json";path.write_text("{}")
            with self.assertRaises(ValueError):v.geo(path)
if __name__=="__main__":unittest.main()
