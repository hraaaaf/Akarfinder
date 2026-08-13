import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildFinalCertification, validateFinalCertification } from "../source-factory-final-certification";
const read=(p:string)=>JSON.parse(fs.readFileSync(p,"utf8"));
const h=read("data/data-mass-2b/high-yield-source-review.json");
const m=read("data/data-mass-2c/mid-yield-source-review.json");
const l=read("data/data-mass-2d/long-tail-source-review.json");

test("MASS-2F certifies the complete reviewed 101-source cohort",()=>{
  const c=buildFinalCertification(h,m,l,"2026-08-13T08:30:00.000Z");
  validateFinalCertification(c);
  assert.deepEqual(c,{schemaVersion:"MASS_2F_FINAL_CERTIFICATION_V1",generatedAt:"2026-08-13T08:30:00.000Z",domains:101,permissionRequired:43,hold:58,canonicalCandidates:43,canonicalApproved:0,publicActivable:0,decisionConflicts:0,expiredEvidence:0,futureDatedEvidence:0,totals:{totalUrlRepresentations:17602,totalLikelyMoroccoRealEstateUrls:16018,totalLikelyMoroccoListingDetailUrls:3051}});
});

test("MASS-2F fails closed on authorization or evidence-time drift",()=>{
  const bad=JSON.parse(JSON.stringify(h)); bad.records[0].publicIndexingMode="CANONICAL_LINK_ONLY";
  assert.throws(()=>validateFinalCertification(buildFinalCertification(bad,m,l,"2026-08-13T08:30:00.000Z")),/(DECISION_DRIFT|DECISION_CONFLICTS)/);
  assert.throws(()=>validateFinalCertification(buildFinalCertification(h,m,l,"2026-10-13T08:30:00.000Z")),/EVIDENCE_TIME_DRIFT/);
});
