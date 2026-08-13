import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildPolicyMatrix, validatePolicyMatrix } from "../source-factory-policy-matrix";
const read=(p:string)=>JSON.parse(fs.readFileSync(p,"utf8"));
const h=read("data/data-mass-2b/high-yield-source-review.json");
const m=read("data/data-mass-2c/mid-yield-source-review.json");
const l=read("data/data-mass-2d/long-tail-source-review.json");

test("MASS-2E consolidates exactly 101 reviewed domains",()=>{
  const matrix=buildPolicyMatrix(h,m,l,"2026-08-13T00:00:00.000Z");
  validatePolicyMatrix(matrix);
  assert.equal(matrix.records[0].rank,1); assert.equal(matrix.records.at(-1)?.rank,101);
  assert.deepEqual(matrix.summary,{domains:101,permissionRequired:43,hold:58,canonicalCandidates:43,canonicalApproved:0,publicActivable:0,registryWrites:0,totalUrlRepresentations:22656,totalLikelyMoroccoRealEstateUrls:19665,totalLikelyMoroccoListingDetailUrls:4114});
});

test("Registry preview cannot activate candidates",()=>{
  const matrix=buildPolicyMatrix(h,m,l,"2026-08-13T00:00:00.000Z");
  assert.equal(matrix.registryPreview.filter((r:any)=>r.machine_gate!=="internal_signal_only").length,0);
  assert.equal(matrix.registryPreview.filter((r:any)=>r.display_gate!=="hidden").length,0);
  assert.equal(matrix.registryPreview.filter((r:any)=>r.allowed_discovery_channels.length>0).length,0);
});
