import test from "node:test";
import assert from "node:assert/strict";
import {projectIndicativeLandmarks,SCHEMA} from "../../neighborhood-context/indicative-osm-landmarks.mjs";
function data(){
 const candidates=[
 {source_id:"node/1",name_osm:"Parc",category:"green_sport",latitude:33.58,longitude:-7.64,location_method:"osm_node"},
 {source_id:"way/2",name_osm:"École",category:"education",latitude:33.59,longitude:-7.63,location_method:"osm_polygon_representative_point"},
 {source_id:"node/3",name_osm:"Pharmacie",category:"health",latitude:33.58,longitude:-7.62,location_method:"osm_node"},
 {source_id:"node/4",name_osm:"Station",category:"transport",latitude:34.01,longitude:-6.8,location_method:"osm_node"}];
 for(const p of candidates)p.source_url="https://www.openstreetmap.org/"+p.source_id;
 return {source:{dataset:"Geofabrik Morocco OpenStreetMap PBF",md5_verified:true,md5:"a".repeat(32),license:"ODbL-1.0"},
 candidates_count:candidates.length,candidates};
}
const bbox=[-7.67,33.57,-7.60,33.61];
test("OSM indicative landmarks need no opening, address or manual proof",()=>{
 const d=data();d.candidates[0].current_operation_verified=false;
 const r=projectIndicativeLandmarks(d,{bbox});
 assert.equal(r.schema,SCHEMA);assert.equal(r.ok,true);assert.equal(r.features.length,3);
 assert.deepEqual(r.features.map(p=>p.properties.category),["education","green_sport","health"]);
 assert.equal(r.businessOperatingStatusCertified,false);assert.equal(r.officialNeighborhoodMembershipCertified,false);
 assert.ok(r.features.every(p=>p.properties.currentlyOpen===null&&p.properties.officialQuarterMembership===null));
 assert.match(r.state,/NO_DB_OR_UI_WRITE/);
});
test("any Moroccan viewport is supported without pretending to know a neighborhood boundary",()=>{
 const r=projectIndicativeLandmarks(data(),{bbox:[-7,33.8,-6.5,34.2]});
 assert.equal(r.features.length,1);assert.equal(r.features[0].properties.name,"Station");
});
test("areas show representative indicative location, never entrance",()=>{
 const r=projectIndicativeLandmarks(data(),{bbox});
 assert.equal(r.features[0].properties.positionType,"indicative-area-point");
});
test("idempotent IDs; same-name nearby OSM entities are not merged",()=>{
 const d=data();d.candidates.push({...d.candidates[0]});
 d.candidates.push({...d.candidates[0],source_id:"node/5",source_url:"https://www.openstreetmap.org/node/5"});
 d.candidates_count=d.candidates.length;
 const r=projectIndicativeLandmarks(d,{bbox});
 assert.equal(r.features.length,4);assert.equal(r.rejections.duplicate,1);
});
test("invalid provenance and license reject the entire extract",()=>{
 for(const key of ["md5_verified","md5","license","dataset"]){
  const d=data();d.source[key]=null;
  assert.equal(projectIndicativeLandmarks(d,{bbox}).ok,false);
 }
});
test("reject bad point/name/OSM identity/category without blocking rest",()=>{
 const d=data();d.candidates[0].latitude=200;d.candidates[1].name_osm="";d.candidates[2].source_url="https://example.com";
 d.candidates[3].category="unknown";
 const r=projectIndicativeLandmarks(d,{bbox:[-8,33,-6,35]});
 assert.equal(r.features.length,0);
 assert.deepEqual(r.rejections,{coordinates:1,name:1,identity:1,category:1});
});
test("invalid bbox and unlimited point count fail closed",()=>{
 assert.equal(projectIndicativeLandmarks(data(),{bbox:[4,5,1,7]}).ok,false);
 assert.equal(projectIndicativeLandmarks(data(),{bbox,limit:1001}).ok,false);
});
test("bounded selection and retained ODbL source attribution",()=>{
 const r=projectIndicativeLandmarks(data(),{bbox,limit:2});
 assert.equal(r.features.length,2);assert.equal(r.attribution,"© OpenStreetMap contributors");
 assert.equal(r.license,"ODbL-1.0");
});
