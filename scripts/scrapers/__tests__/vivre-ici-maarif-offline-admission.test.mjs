import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePrivateOfflineAdmission, verifyPinnedCandidateExportBytes, QA_SCHEMA, REVIEW_SCHEMA, PINNED_MD5 }
  from "../../neighborhood-context/maarif-offline-review-admission.mjs";

const NOW=new Date("2026-11-09T17:00:00Z");
function data() {
  return {
    source:{
      schema:QA_SCHEMA, status:"QA_CANDIDATES_NOT_PUBLISHABLE",
      source:{md5:PINNED_MD5,md5_verified:true,license:"ODbL-1.0"},
      publication_guard:{eligible:false,no_ui_publication:true,db_write:false},
      geographic_scope:{claim:"radius_context_only_no_quarter_membership",radius_m:1800,reference_center:{latitude:33.5898,longitude:-7.644}},
      candidates_count:1,
      counts:{groceries:1},
      object_types:{node:1},
      candidates:[{
        source_id:"node/123", source_url:"https://www.openstreetmap.org/node/123",
        category:"groceries",name_osm:"Synthetic corner store",latitude:33.5898,longitude:-7.644,
        status:"candidate_requires_independent_review",
        current_operation_verified:false,position_precision_independently_verified:false,
        central_quarter_membership_certified:false,source_license:"ODbL-1.0",
      }],
    },
    manifest:{
      checksum_matched:true,checksum:PINNED_MD5,file_size_bytes:244434479,
      pbf_header_replication_timestamp_utc:"2026-11-08T21:21:00Z",
    },
    reviews:{
      schema:REVIEW_SCHEMA,status:"PRIVATE_SECONDARY_SOURCE_REVIEW_NOT_PUBLISHABLE",
      candidates:[{osm_id:"node/123",safe_to_publish_as_verified:false,
        review_status:"PENDING",source_review_state:"secondary_source_found"}],
    },
    now:NOW,
  };
}
function checked(x){
  const entry=x.reviews.candidates[0];
  entry.safe_to_publish_as_verified=true;
  entry.review_status="approved_for_private_preview";
  entry.independent_review={
    reviewer_id:"tester-SYNTHETIC",
    reviewed_at:"2026-11-09T15:00:00Z",
    identity:{name_address_match:true,source_url:"https://operator.example.com/store",verified_at:"2026-11-08T15:00:00Z"},
    position:{source_url:"https://survey.example.com/pin",latitude:33.58981,longitude:-7.644,verified_at:"2026-11-08T16:00:00Z"},
    operation:{source_url:"https://registry.example.com/status",documented_as_operating_at_check:true,verified_at:"2026-11-07T15:00:00Z"},
    odbl:{odbl_review_accepted:true,reviewer_id:"tester-SYNTHETIC",checked_at:"2026-11-08T15:00:00Z"},
    boundary_claim:"radius_context_only",quartier_central_certified:false,
    current_open_now_claim:false,
  };
  return x;
}

test("unreviewed OSM candidate yields zero admissions, even when name/address appears in a directory",()=>{
  const result=evaluatePrivateOfflineAdmission(data());
  assert.equal(result.extraction_structurally_valid,true,result.hardErrors.join(","));
  assert.equal(result.source_candidate_count,1);
  assert.equal(result.review_admission_candidates.length,0);
  assert.equal(result.refused_by_reason.manual_review_not_approved,1);
  assert.equal(result.never_publish_automatically,true);
  assert.equal(result.database_write,false);
});
test("synthetic complete manual checklist gives private preview *candidate*, never a public record",()=>{
  const result=evaluatePrivateOfflineAdmission(checked(data()));
  assert.equal(result.extraction_structurally_valid,true,result.hardErrors.join(","));
  assert.equal(result.review_admission_candidates.length,1);
  assert.equal(result.review_admission_candidates[0].publication_status,"requires_separate_human_release");
  assert.equal(result.review_admission_candidates[0].evidence_observed_at,"2026-11-07T15:00:00.000Z");
  assert.equal(result.never_publish_automatically,true);
});
test("old identity confirmation cannot be refreshed by new PBF download date",()=>{
  const x=checked(data());
  x.reviews.candidates[0].independent_review.identity.verified_at="2026-08-16T15:00:00Z";
  const result=evaluatePrivateOfflineAdmission(x);
  assert.equal(result.review_admission_candidates.length,0);
  assert.equal(result.refused_by_reason.independent_identity_missing,1);
});
test("rejects distant independent coordinates, even if all review checkboxes are true",()=>{
  const x=checked(data());
  x.reviews.candidates[0].independent_review.position.latitude=33.70;
  const result=evaluatePrivateOfflineAdmission(x);
  assert.equal(result.refused_by_reason.position_mismatch,1);
});
test("refuses ungrounded central-quartier or current-open-now claims",()=>{
  for(const flag of ["quartier_central_certified","current_open_now_claim"]){
    const x=checked(data());
    x.reviews.candidates[0].independent_review[flag]=true;
    const result=evaluatePrivateOfflineAdmission(x);
    assert.equal(result.review_admission_candidates.length,0);
    assert.equal(result.refused_by_reason.unsupported_boundary_or_open_now_claim,1);
  }
});
test("rejects one webpage recycled as three independent proofs",()=>{
  const x=checked(data()), evidence=x.reviews.candidates[0].independent_review;
  evidence.position.source_url=evidence.identity.source_url;
  evidence.operation.source_url=evidence.identity.source_url;
  const result=evaluatePrivateOfflineAdmission(x);
  assert.equal(result.refused_by_reason.single_source_cannot_prove_three_independent_checks,1);
});
test("rejects changed PBF checksum and a review of an unknown OSM object",()=>{
  let x=checked(data());
  x.manifest.checksum_matched=false;
  assert.ok(evaluatePrivateOfflineAdmission(x).hardErrors.includes("pbf_manifest_mismatch"));
  x=checked(data());
  x.reviews.candidates[0].osm_id="node/999";
  assert.ok(evaluatePrivateOfflineAdmission(x).hardErrors.includes("duplicate_or_unknown_review_identity"));
});
test("rejects duplicated reviewer IDs for same OSM entity and a forged source pre-certification",()=>{
  let x=checked(data());
  x.reviews.candidates.push({...x.reviews.candidates[0]});
  assert.ok(evaluatePrivateOfflineAdmission(x).hardErrors.includes("duplicate_or_unknown_review_identity"));
  x=checked(data());
  x.source.candidates[0].current_operation_verified=true;
  assert.ok(evaluatePrivateOfflineAdmission(x).hardErrors.includes("candidate_claims_prior_certification"));
});

test("rejects tampered category counts and a point outside the radius",()=>{
  let x=data();
  x.source.counts.groceries=999;
  assert.ok(evaluatePrivateOfflineAdmission(x).hardErrors.includes("category_count_mismatch"));
  x=data();
  x.source.candidates[0].latitude=35;
  assert.ok(evaluatePrivateOfflineAdmission(x).hardErrors.includes("malformed_or_outside_radius_candidate"));
});
test("rejects forged district membership or a future object modification timestamp",()=>{
  let x=data();
  x.source.geographic_scope.claim="certified_quartier";
  assert.ok(evaluatePrivateOfflineAdmission(x).hardErrors.includes("source_radius_not_certified_pilot"));
  x=data();
  x.source.candidates[0].osm_object_modified_at="2030-01-01T00:00:00Z";
  assert.ok(evaluatePrivateOfflineAdmission(x).hardErrors.includes("invalid_object_edit_timestamp"));
});

test("pinned raw JSON export SHA-256 detects mutation of otherwise plausible OSM candidate data",async ()=>{
  const text=JSON.stringify({osm_id:"node/123",name:"synthetic"});
  const digest="9".repeat(64);
  assert.equal(verifyPinnedCandidateExportBytes(Buffer.from(text),{candidate_snapshot_sha256:digest}),false);
  const {createHash}=await import("node:crypto");
  const correct=createHash("sha256").update(Buffer.from(text)).digest("hex");
  assert.equal(verifyPinnedCandidateExportBytes(Buffer.from(text),{candidate_snapshot_sha256:correct}),true);
  assert.equal(verifyPinnedCandidateExportBytes(Buffer.from(text+" "),{candidate_snapshot_sha256:correct}),false);
});

test("rejects OSM-derived map directories as independent identity or GPS evidence", () => {
  for (const url of ["https://mapcarta.com/fr/N2824741221", "https://tiles.mapcarta.com/derived", "https://rues-maroc.openalfa.com/casablanca/shopping"]) {
    const a=checked(data());
    a.reviews.candidates[0].independent_review.identity.source_url=url;
    assert.equal(evaluatePrivateOfflineAdmission(a).refused_by_reason.independent_identity_missing,1);
    const b=checked(data());
    b.reviews.candidates[0].independent_review.position.source_url=url;
    assert.equal(evaluatePrivateOfflineAdmission(b).refused_by_reason.independent_position_missing,1);
  }
});