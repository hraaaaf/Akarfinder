#!/usr/bin/env python3
"""Offline fixture validates OSM name matching and fail-closed GIS output."""
import importlib.util
import json
import tempfile
from pathlib import Path

source=Path(__file__).resolve().parents[1]/"maarif-historical-axis-osm-audit.py"
spec=importlib.util.spec_from_file_location("maarif_axis_qa",source)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
assert m.norm("Bd. Mohamed ZerKTOUNI")=="bd mohamed zerktouni"
assert m.groups_for_tags({"highway":"primary","name":"Boulevard Mohamed Zerktouni"})=={"east_zerktouni"}
assert m.groups_for_tags({"highway":"footway","name":"Boulevard Mohamed Zerktouni"})==set()
assert m.groups_for_tags({"highway":"primary","name":"Boulevard Brahim Roudani"})=={"south_roudani"}
assert m.groups_for_tags({"highway":"residential","name:fr":"Boulevard Bir Anzarane"})=={"west_bir_anzarane"}
assert m.groups_for_tags({"highway":"primary","name":"Avenue des FAR"})==set()
assert m.groups_for_tags({"highway":"residential","name":"Rue Abdeslam Khattabi"})==set()
assert m.groups_for_tags({"highway":"residential","name":"Rue Corniche d'Anfa"})==set()
assert m.groups_for_tags({"highway":"residential","name":"Rue Libya"})==set()
assert m.groups_for_tags({"highway":"primary","name":"Boulevard Abdelkrim El Khattabi"})=={"north_khattabi"}
assert m.groups_for_tags({"highway":"primary","name":"Boulevard d'Anfa"})=={"north_anfa"}
assert m.groups_for_tags({"highway":"primary","name":"Boulevard Bir Anzarane"})=={"west_bir_anzarane"}

fixture="""<?xml version="1.0" encoding="utf-8"?>
<osm version="0.6" generator="private-synthetic-qa">
<node id="1" lat="33.589" lon="-7.644" version="1" timestamp="2024-01-01T00:00:00Z"/>
<node id="2" lat="33.590" lon="-7.645" version="1" timestamp="2024-01-01T00:00:00Z"/>
<node id="3" lat="34.0" lon="-7.0" version="1" timestamp="2024-01-01T00:00:00Z"/>
<way id="42" version="1" timestamp="2024-01-01T00:00:00Z">
<nd ref="1"/><nd ref="2"/>
<tag k="highway" v="primary"/><tag k="name" v="Boulevard Brahim Roudani"/>
</way>
<way id="43" version="1" timestamp="2024-01-01T00:00:00Z">
<nd ref="1"/><nd ref="2"/>
<tag k="highway" v="footway"/><tag k="name" v="Boulevard Mohamed Zerktouni"/>
</way>
<way id="44" version="1" timestamp="2024-01-01T00:00:00Z">
<nd ref="1"/><nd ref="3"/>
<tag k="highway" v="primary"/><tag k="name" v="Boulevard d'Anfa"/>
</way>
</osm>
"""
with tempfile.TemporaryDirectory() as work:
    p=Path(work)
    inp=p/"synthetic.osm"
    out=p/"result.json"
    inp.write_text(fixture,encoding="utf8")
    report=m.audit(inp,out,require_pinned=False)
    assert report["source_nodes_scanned"] is None and report["node_locations_indexed_natively"] is True
    assert report["matched_way_counts"]["south_roudani"]==1
    assert report["matched_way_counts"]["north_anfa"]==0, "Only 1 node inside bbox for that way"
    assert report["matched_way_counts"]["east_zerktouni"]==0, "No pedestrian ways"
    assert report["derived_polygon"] is None
    assert report["2026_central_sector_boundary_certified"] is False
    assert report["publishable"] is False
    assert json.loads(out.read_text(encoding="utf8"))["no_db_write"] is True
print("synthetic ways / name matching / clipped bbox / no polygon: PASS")
