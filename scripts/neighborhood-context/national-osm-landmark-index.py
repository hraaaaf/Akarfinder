#!/usr/bin/env python3
"""Private nationwide Geofabrik PBF -> SQLite RTree of indicative OSM landmarks.

Never touches a production database, a public endpoint, or Vercel. The index is
a private QA artifact; a viewport query shows visual landmarks, not currently
operating businesses, precise entrances, or official neighborhood membership.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import os
import sqlite3
import sys
import time
from collections import Counter
from pathlib import Path

SCHEMA="AKARFINDER_OSM_INDICATIVE_LANDMARKS_V1"
INDEX_SCHEMA="AKARFINDER_OSM_LANDMARKS_RTREE_V1"
SOURCE="Geofabrik Morocco OpenStreetMap PBF"
LICENSE="ODbL-1.0"
CATEGORIES=("education","green_sport","groceries","health","shopping","transport")
TAGS={
 "education":{"amenity":("school","kindergarten","college","university")},
 "green_sport":{"leisure":("park","playground","fitness_centre","sports_centre","pitch")},
 "groceries":{"shop":("supermarket","convenience","greengrocer","grocery"),"amenity":("marketplace",)},
 "health":{"amenity":("pharmacy","clinic","hospital","doctors","dentist")},
 "shopping":{"shop":("mall","department_store")},
 "transport":{"highway":("bus_stop",),"public_transport":("platform","station"),
              "railway":("station","halt","tram_stop")},
}
def category_for(tags):
    for cat,predicates in TAGS.items():
        if any(tags.get(key,"") in options for key,options in predicates.items()):
            return cat
    return None

def file_hashes(path):
    h=hashlib.md5()
    sha=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(4*1024*1024),b""):
            h.update(chunk)
            sha.update(chunk)
    return h.hexdigest(),sha.hexdigest()

def md5_expected(text):
    token=text.strip().split()[0].lower() if text.strip() else ""
    if len(token)!=32 or any(char not in "0123456789abcdef" for char in token):
        raise ValueError("Invalid Geofabrik MD5 file")
    return token

def row_valid(osm_id,name,cat,lat,lon,kind):
    if not isinstance(osm_id,str) or "/" not in osm_id:return False
    obj,number=osm_id.split("/",1)
    if obj not in ("node","way","relation") or not number.isdigit() or int(number)<1:return False
    if not isinstance(name,str) or not name.strip() or len(name.strip())>200:return False
    if cat not in CATEGORIES or kind not in ("osm_node","osm_polygon_representative_point"):return False
    return all(isinstance(x,(float,int)) and math.isfinite(x) for x in (lat,lon)) and -90<=lat<=90 and -180<=lon<=180

def create_schema(db):
    db.executescript("""
        PRAGMA journal_mode=DELETE;
        PRAGMA synchronous=FULL;
        CREATE TABLE landmarks (
          id INTEGER PRIMARY KEY, osm_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
          category TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL,
          point_kind TEXT NOT NULL, osm_edited_at TEXT
        );
        CREATE VIRTUAL TABLE landmark_bbox USING rtree(id,min_lon,max_lon,min_lat,max_lat);
        CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    """)

class Writer:
    def __init__(self,db):
        self.db=db
        self.counts=Counter()
        self.rejections=Counter()
        self.pending=0
        db.execute("BEGIN")
    def add(self,osm_id,name,cat,lat,lon,kind,edited=None):
        if not row_valid(osm_id,name,cat,lat,lon,kind):
            self.rejections["invalid_row"]+=1
            return False
        cur=self.db.execute("INSERT OR IGNORE INTO landmarks(osm_id,name,category,lat,lon,point_kind,osm_edited_at) VALUES (?,?,?,?,?,?,?)",
            (osm_id,name.strip(),cat,float(lat),float(lon),kind,edited))
        if not cur.rowcount:
            self.rejections["duplicate_exact_osm_id"]+=1
            return False
        i=cur.lastrowid
        self.db.execute("INSERT INTO landmark_bbox(id,min_lon,max_lon,min_lat,max_lat) VALUES (?,?,?,?,?)",
                        (i,lon,lon,lat,lat))
        self.counts[cat]+=1
        self.pending+=1
        if self.pending>=2000:
            self.db.commit()
            self.db.execute("BEGIN")
            self.pending=0
        return True
    def finish(self):
        self.db.commit()

def create_osmium_handler(writer):
    try:
        import osmium
        from shapely.geometry import shape
    except ImportError as e:
        raise RuntimeError("pyosmium and shapely required in offline QA") from e
    class Extractor(osmium.SimpleHandler):
        def __init__(self):
            super().__init__()
            self.factory=osmium.geom.GeoJSONFactory()
            self.nodes_visited=0
            self.areas_visited=0
            self.geometry_errors=0
        def node(self,node):
            self.nodes_visited+=1
            cat=category_for(node.tags)
            if cat is None:return
            name=str(node.tags.get("name") or node.tags.get("name:fr") or node.tags.get("name:ar") or "")
            if not name or not node.location.valid():return
            writer.add(f"node/{node.id}",name,cat,node.location.lat,node.location.lon,
                       "osm_node",str(node.timestamp) if node.timestamp else None)
        def area(self,area):
            self.areas_visited+=1
            cat=category_for(area.tags)
            if cat is None:return
            name=str(area.tags.get("name") or area.tags.get("name:fr") or area.tags.get("name:ar") or "")
            if not name:return
            try:
                polygon=shape(json.loads(self.factory.create_multipolygon(area)))
                if polygon.is_empty or not polygon.is_valid:
                    self.geometry_errors+=1
                    return
                point=polygon.representative_point()
                kind="way" if area.from_way() else "relation"
                writer.add(f"{kind}/{area.orig_id()}",name,cat,point.y,point.x,
                           "osm_polygon_representative_point",str(area.timestamp) if area.timestamp else None)
            except Exception:
                self.geometry_errors+=1
    return Extractor()

def build(pbf,md5_file,index,report):
    if not pbf.is_file() or not md5_file.is_file():raise ValueError("PBF or MD5 missing")
    expected=md5_expected(md5_file.read_text(encoding="utf-8"))
    actual,sha256=file_hashes(pbf)
    if expected!=actual:raise ValueError("Checksum mismatch: refused to build index")
    if index.exists():raise ValueError("Index already exists: use a new versioned QA output path")
    temp=index.with_name(index.name+".part")
    if temp.exists():raise ValueError("Interrupted .part index: inspect before retry")
    index.parent.mkdir(parents=True,exist_ok=True)
    t=time.perf_counter()
    db=sqlite3.connect(str(temp))
    try:
        create_schema(db)
        writer=Writer(db)
        handler=create_osmium_handler(writer)
        handler.apply_file(str(pbf),locations=True,idx="flex_mem")
        writer.finish()
        total=sum(writer.counts.values())
        if total<1:raise ValueError("No named OSM landmarks found")
        meta={"schema":INDEX_SCHEMA,"source":SOURCE,"license":LICENSE,"md5":actual,"sha256":sha256,
              "geographic_scope":"whole-Morocco-not-district",
              "publication_state":"PRIVATE_QA_ONLY","feature_count":str(total)}
        with db:
            db.executemany("INSERT INTO metadata(key,value) VALUES (?,?)",meta.items())
        if db.execute("PRAGMA quick_check").fetchone()!=("ok",):
            raise ValueError("SQLite quick_check failed")
        db.close()
        os.replace(temp,index)
        summary={"schema":INDEX_SCHEMA,"ok":True,"featureCount":total,
                 "byCategory":dict(writer.counts),"rejections":dict(writer.rejections),
                 "nodesVisited":handler.nodes_visited,"areasVisited":handler.areas_visited,
                 "areaGeometryErrors":handler.geometry_errors,"md5":actual,"sha256":sha256,
                 "indexBytes":index.stat().st_size,
                 "elapsedSeconds":round(time.perf_counter()-t,3),
                 "dbProductWrites":0,"status":"PRIVATE_QA_ONLY"}
        report.parent.mkdir(parents=True,exist_ok=True)
        report.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        return summary
    except Exception:
        db.close()
        if temp.exists():temp.unlink()
        raise

def bbox_valid(b):
    if len(b)!=4 or not all(isinstance(x,(float,int)) and math.isfinite(x) for x in b):
        raise ValueError("Invalid bbox: need four finite numbers")
    west,south,east,north=b
    if west<-180 or east>180 or south<-90 or north>90 or west>=east or south>=north:
        raise ValueError("Invalid bbox bounds")
    return b

def query(index,bbox,limit=180):
    west,south,east,north=bbox_valid(bbox)
    if not isinstance(limit,int) or not 1<=limit<=1000:raise ValueError("Limit must be 1..1000")
    if not index.is_file():raise ValueError("Index not found")
    db=sqlite3.connect(index.resolve().as_uri()+"?mode=ro",uri=True)
    try:
        metadata=dict(db.execute("SELECT key,value FROM metadata"))
        if metadata.get("schema")!=INDEX_SCHEMA or metadata.get("source")!=SOURCE or \
            metadata.get("license")!=LICENSE or metadata.get("publication_state")!="PRIVATE_QA_ONLY" or \
            len(metadata.get("md5",""))!=32 or len(metadata.get("sha256",""))!=64:
            raise ValueError("Index provenance invalid: refused to query")
        t=time.perf_counter()
        pools={}
        for cat in CATEGORIES:
            pools[cat]=db.execute("""
                SELECT p.osm_id,p.name,p.lat,p.lon,p.point_kind
                FROM landmark_bbox b JOIN landmarks p ON p.id=b.id
                WHERE b.min_lon>=? AND b.max_lon<=? AND b.min_lat>=? AND b.max_lat<=?
                  AND p.lon BETWEEN ? AND ? AND p.lat BETWEEN ? AND ?
                  AND p.category=? ORDER BY p.osm_id LIMIT ?
            """,(west,east,south,north,west,east,south,north,cat,limit)).fetchall()
        features=[]
        while len(features)<limit:
            found=False
            for cat in CATEGORIES:
                if not pools[cat]:continue
                osm_id,name,lat,lon,kind=pools[cat].pop(0)
                features.append({"type":"Feature",
                  "geometry":{"type":"Point","coordinates":[lon,lat]},
                  "properties":{"osmId":osm_id,"name":name,"category":cat,
                    "sourceUrl":"https://www.openstreetmap.org/"+osm_id,
                    "positionType":"osm-node" if kind=="osm_node" else "indicative-area-point",
                    "currentlyOpen":None,"officialQuarterMembership":None}})
                found=True
                if len(features)>=limit:break
            if not found:break
        return {"schema":SCHEMA,"ok":True,"label":"Repères à proximité",
                "source":"OpenStreetMap via Geofabrik","attribution":"© OpenStreetMap contributors",
                "license":"ODbL-1.0","licenseUrl":"https://www.openstreetmap.org/copyright",
                "officialNeighborhoodMembershipCertified":False,"businessOperatingStatusCertified":False,
                "entrancePrecisionCertified":False,
                "state":"PRIVATE_CANDIDATE_NO_DB_OR_UI_WRITE",
                "indexSourceMd5":metadata["md5"],"sourceFeatureCount":int(metadata["feature_count"]),
                "queryDurationMs":round((time.perf_counter()-t)*1000,3),"features":features}
    finally:
        db.close()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    subs=parser.add_subparsers(dest="command",required=True)
    b=subs.add_parser("build")
    for param in ("pbf","md5-file","index","report"):
        b.add_argument("--"+param,type=Path,required=True)
    q=subs.add_parser("query")
    q.add_argument("--index",type=Path,required=True)
    q.add_argument("--bbox",required=True)
    q.add_argument("--limit",type=int,default=180)
    q.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    if args.command=="build":
        print(json.dumps(build(args.pbf,args.md5_file,args.index,args.report),ensure_ascii=False))
    else:
        result=query(args.index,[float(v) for v in args.bbox.split(",")],args.limit)
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(json.dumps({"ok":True,"features":len(result["features"]),
            "elapsedMs":result["queryDurationMs"],"output":str(args.output)},ensure_ascii=False))

if __name__=="__main__":
    try:main()
    except (ValueError,RuntimeError,sqlite3.Error) as e:
        print(str(e),file=sys.stderr)
        sys.exit(2)
