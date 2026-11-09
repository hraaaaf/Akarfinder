import test from "node:test";
import assert from "node:assert/strict";
import {evaluateMaarifSourceClaims, extractStreetNumber, SOURCE_CLAIMS_SCHEMA}
  from "../../neighborhood-context/maarif-source-claims-qa.mjs";

const BASE_TIME="2026-11-09T21:00:00Z";
function claim(osm_id,url,address,source_tier="institution_primary"){
  return {osm_id,field:"street_address",value:address,source_url:url,
    source_tier,document_type:"webpage",captured_at:BASE_TIME,
    asserted_current_operation:false,asserted_independent_gps:false};
}
function ledger(claims){
  return {schema:SOURCE_CLAIMS_SCHEMA,status:"PRIVATE_QA_SOURCE_ASSERTIONS_NOT_VERIFIED",claims};
}
const id="way/1308527857";
const a=()=>claim(id,"https://official.example.org/schools","199 Boulevard d'Anfa");
const b=()=>({...claim(id,"https://official.example.org/schools-2026.pdf","192 Bd d'Anfa"),document_type:"pdf",document_date:"2026-02-25"});

test("recognizes typed street numbers in primary-source address statements",()=>{
  assert.equal(extractStreetNumber("199 Boulevard d'Anfa"),199);
  assert.equal(extractStreetNumber("192 Bd d'Anfa"),192);
  assert.equal(extractStreetNumber("Rue piétonne – Rue Normandie"),null);
});
test("conflicting 199 and 192 on the same OSM entity is an explicit human blocker",()=>{
  const r=evaluateMaarifSourceClaims(ledger([a(),b()]));
  assert.equal(r.structural_ok,true);
  assert.equal(r.conflicts.length,1);
  assert.deepEqual(r.conflicts[0].numbers,[192,199]);
  assert.equal(r.conflicts[0].safe_to_geocode_or_publish,false);
  assert.deepEqual(r.needs_manual_resolution,[id]);
  assert.equal(r.ready_for_publication,0);
});
test("matching primary addresses do not by themselves certify coordinates or current activity",()=>{
  const c=b();c.value="199 Bd d'Anfa";
  const r=evaluateMaarifSourceClaims(ledger([a(),c]));
  assert.equal(r.conflicts.length,0);
  assert.equal(r.ready_for_publication,0);
  assert.equal(r.independent_gps_certifications,0);
  assert.equal(r.current_operation_certifications,0);
});
test("a secondary directory cannot settle a contradiction between two primaries",()=>{
  const c=claim(id,"https://directory.example.com/location","192 boulevard d'Anfa","other_secondary");
  const r=evaluateMaarifSourceClaims(ledger([a(),b(),c]));
  assert.equal(r.conflicts.length,1);
  assert.equal(r.secondary_source_claims,1);
});
test("distinct OSM identities are never conflated because street addresses overlap",()=>{
  const r=evaluateMaarifSourceClaims(ledger([a(),
    claim("node/123","https://another.example.org/branch","192 Bd d'Anfa")]));
  assert.equal(r.candidate_count,2);
  assert.equal(r.conflicts.length,0);
});
test("missing street number needs manual geolocation, never silent geocoding",()=>{
  const r=evaluateMaarifSourceClaims(ledger([claim("node/14","https://store.example.com/outlet","Boulevard Abdelatif Benkaddour angle rue Ahmed Charci","operator_primary")]));
  assert.equal(r.conflicts.length,0);
  assert.deepEqual(r.needs_manual_resolution,["node/14"]);
});
test("duplicate source assertions or unknown URL schemes fail closed",()=>{
  assert.ok(evaluateMaarifSourceClaims(ledger([a(),a()])).hardErrors.includes("repeated_source_claim"));
  const c=a();c.source_url="http://official.example.org/schools";
  assert.ok(evaluateMaarifSourceClaims(ledger([c])).hardErrors.includes("claim_invalid_or_forged_proof"));
});
test("reported GPS and open-now validations from a source-only ledger are rejected",()=>{
  const g=a();g.asserted_independent_gps=true;
  assert.ok(evaluateMaarifSourceClaims(ledger([g])).hardErrors.includes("claim_invalid_or_forged_proof"));
  const z=a();z.asserted_current_operation=true;
  assert.ok(evaluateMaarifSourceClaims(ledger([z])).hardErrors.includes("claim_invalid_or_forged_proof"));
});
test("invalid source timestamps or malformed OSM identities are rejected",()=>{
  const x=a();x.captured_at="not-a-date";
  assert.ok(evaluateMaarifSourceClaims(ledger([x])).hardErrors.includes("claim_invalid_or_forged_proof"));
  const y=a();y.osm_id="fake:123";
  assert.ok(evaluateMaarifSourceClaims(ledger([y])).hardErrors.includes("claim_invalid_or_forged_proof"));
});
