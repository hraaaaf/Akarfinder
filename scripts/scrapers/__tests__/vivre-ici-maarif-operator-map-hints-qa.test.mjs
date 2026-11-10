import test from "node:test";
import assert from "node:assert/strict";
import {
  googleSearchCameraCenter, metersBetween, evaluateOperatorMapHints, OPERATOR_MAP_QA_SCHEMA,
} from "../../neighborhood-context/maarif-operator-map-hints-qa.mjs";

const mapUrl="https://www.google.fr/maps/search/Angle++Rue+Normandie+-+Amina+Bint+Wahab+et+Ibn+Yahia+al+Ifrani++20100+CASABLANCA/@33.5860682,-7.6415079,17z/data=!3m1!4b1";
const now=new Date("2026-11-09T23:25:00Z");
function data(){
  return {
    schema:OPERATOR_MAP_QA_SCHEMA, status:"PRIVATE_QA_UNVERIFIED",
    candidates:[{
      osm_id:"node/12113618487",osm_lat:33.588541,osm_lon:-7.6402761,
      operator_page_url:"https://www.fitnesspark.ma/club/casablanca-racine/",
      operator_map_url:mapUrl,
      source_checked_at:"2026-11-09T22:35:00Z",
      independent_gps_verified:false,current_activity_verified:false,
    }],
  };
}
test("extracts a search-map camera center, NOT an independent place pin",()=>{
 const p=googleSearchCameraCenter(mapUrl);
 assert.equal(p.coordinate_semantics,"camera_center_NOT_business_pin");
 assert.equal(p.latitude,33.5860682);
 assert.equal(p.longitude,-7.6415079);
});
test("observed Fitness Park map center is about 298 m from its OSM node, without declaring an entrance error",()=>{
 const r=evaluateOperatorMapHints(data(),now);
 assert.equal(r.structurally_valid,true);
 assert.equal(r.spatial_discrepancies_over_100_m,1);
 assert.ok(r.observations[0].distance_camera_center_to_osm_m>290);
 assert.ok(r.observations[0].distance_camera_center_to_osm_m<305);
 assert.equal(r.observations[0].actual_entrance_location_established,false);
 assert.equal(r.observations[0].assessment,"VIEWPORT_VS_OSM_POSITION_DIFFERENCE_REQUIRES_REVIEW");
 assert.equal(r.independent_gps_certified,0);
 assert.equal(r.publication_eligible,0);
});
test("Google camera center near OSM is still NOT proof of a pin, nor publication eligible",()=>{
 const x=data();
 x.candidates[0].osm_lat=33.5860682;
 x.candidates[0].osm_lon=-7.6415079;
 const r=evaluateOperatorMapHints(x,now);
 assert.equal(r.observations[0].distance_camera_center_to_osm_m,0);
 assert.equal(r.observations[0].assessment,"VIEWPORT_NEARBY_STILL_NOT_A_GPS_PIN");
 assert.equal(r.publication_allowed,false);
});
test("rejects spoofed Google domains, non-HTTPS and malformed coordinate URLs",()=>{
 for(const url of [
  "https://www.google.fr.evil.test/maps/search/Foo/@33.5,-7.6,17z",
  "http://google.fr/maps/search/Foo/@33.5,-7.6,17z",
  "https://google.fr/maps/search/Foo/@133,-7.6,17z",
  "https://google.fr/maps/place/Foo/@33.5,-7.6,17z",
 ])assert.equal(googleSearchCameraCenter(url),null);
});
test("unknown map links yield an explicit unrecognized status, not a GPS certification",()=>{
 const x=data();x.candidates[0].operator_map_url="https://www.openstreetmap.org/node/12113618487";
 const r=evaluateOperatorMapHints(x,now);
 assert.equal(r.observations[0].assessment,"UNRECOGNIZED_MAP_LINK_MANUAL_REVIEW");
 assert.equal(r.observations[0].coordinate_independently_certified,false);
});
test("forged independent GPS or current open-now claims are rejected",()=>{
 for(const field of ["independent_gps_verified","current_activity_verified"]){
  const x=data();x.candidates[0][field]=true;
  assert.ok(evaluateOperatorMapHints(x,now).hard_errors.includes("invalid_candidate_or_unjustified_approval"));
 }
});
test("duplicate OSM identity and future timestamp are rejected",()=>{
 const x=data();x.candidates.push({...x.candidates[0]});
 assert.ok(evaluateOperatorMapHints(x,now).hard_errors.includes("invalid_candidate_or_unjustified_approval"));
 const y=data();y.candidates[0].source_checked_at="2031-01-01T00:00:00Z";
 assert.ok(evaluateOperatorMapHints(y,now).hard_errors.includes("invalid_candidate_or_unjustified_approval"));
});
test("invalid ledger cannot fabricate publication eligibility",()=>{
 const r=evaluateOperatorMapHints({schema:"fake",candidates:[]},now);
 assert.equal(r.structurally_valid,false);
 assert.equal(r.publication_eligible,0);
 assert.equal(r.publication_allowed,false);
});
