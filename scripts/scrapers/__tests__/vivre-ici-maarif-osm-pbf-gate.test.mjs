import test from "node:test";
import assert from "node:assert/strict";
import { checkPbfPrivateQa, SCHEMA } from "../../audits/vivre-ici-maarif-osm-pbf-gate.mjs";

function makeSample(){
  return {
    schema:SCHEMA,status:"QA_CANDIDATES_NOT_PUBLISHABLE",
    source:{md5_verified:true,md5:"c2334c9499b4565a6a16cf2f45624912",license:"ODbL-1.0"},
    publication_guard:{
      eligible:false,db_write:false,no_ui_publication:true,
      all_individual_operations_unverified:true,all_individual_coords_unverified:true,
      boundary_unreviewed:true,
    },
    geographic_scope:{claim:"radius_context_only_no_quarter_membership",radius_m:1800},
    candidates_count:1,
    counts:{education:0,green_sport:0,groceries:0,health:1,shopping:0,transport:0},
    object_types:{node:1},
    rejections:{missing_name:2,area_geometry_error:0},
    candidates:[{
      source_id:"node/1",source_url:"https://www.openstreetmap.org/node/1",
      name_osm:"Synthetic test pharmacy",category:"health",
      latitude:33.5898,longitude:-7.644,distance_from_center_m:0,
      current_operation_verified:false,
      position_precision_independently_verified:false,
      central_quarter_membership_certified:false,
      source_license:"ODbL-1.0",location_method:"osm_node",
    }],
  };
}
test("structurally valid OSM PBF remains private and cannot certify business activity",()=>{
  const r=checkPbfPrivateQa(makeSample());
  assert.equal(r.ok,true,r.errors.join(","));
  assert.equal(r.publishable,false);
  assert.equal(r.certification,"STRUCTURAL_QA_ONLY");
  assert.equal(r.reviewedOperationalStatusCount,0);
  assert.ok(r.warnings.includes("radius_not_certified_quarter_membership"));
});
test("reject altered MD5 state and illegally enabled publication",()=>{
  const a=makeSample();a.source.md5_verified=false;a.publication_guard.eligible=true;
  const r=checkPbfPrivateQa(a);assert.equal(r.ok,false);
  assert.ok(r.errors.includes("checksum_not_confirmed"));assert.ok(r.errors.includes("publishing_guard"));
});
test("reject duplicate identity and mismatch between category counts and payload",()=>{
  const a=makeSample();
  a.candidates.push({...a.candidates[0]});
  a.candidates_count=2;
  const r=checkPbfPrivateQa(a);assert.equal(r.ok,false);
  assert.ok(r.errors.some(e=>e.includes("duplicate_identity")));
  assert.ok(r.errors.some(e=>e.includes("category_count:health")));
});
test("reject fabricated activity, coordinates or central quartier certification",()=>{
  for(const flag of ["current_operation_verified","position_precision_independently_verified","central_quarter_membership_certified"]){
    const a=makeSample();a.candidates[0][flag]=true;
    const r=checkPbfPrivateQa(a);
    assert.equal(r.ok,false);assert.ok(r.errors.some(e=>e.startsWith("false_poi_certification")));
  }
});
test("reject outside-radius candidates instead of assuming polygon membership",()=>{
  const a=makeSample();a.candidates[0].latitude=33.71;
  const r=checkPbfPrivateQa(a);assert.equal(r.ok,false);
  assert.ok(r.errors.some(e=>e.startsWith("outside_reference_radius")));
});
test("reject incorrect source provenance or altered OSM object type counts",()=>{
  const a=makeSample();a.candidates[0].source_url="https://example.com";
  a.object_types.node=0;
  const r=checkPbfPrivateQa(a);assert.equal(r.ok,false);
  assert.ok(r.errors.includes("bad_source_url:node/1"));
  assert.ok(r.errors.includes("object_type_count:node"));
});
