import test from "node:test";
import assert from "node:assert/strict";
import {cardSignature,compareCrossPortalCards} from "../cross-source-card-dedup-v1.mjs";
const m={identity:"a:1",city:"Rabat",district:"Agdal",price_mad:8000,surface_m2:80,five_field_observed:true};
const d={identity:"domio:2",city:"rabat",district:"Agdâl",price_mad:8000,surface_m2:80,five_field_present:true};
test("normalizes accented location but never treats a signature as confirmed identity",()=>{
 const r=compareCrossPortalCards([m],[d]);
 assert.equal(cardSignature(m),cardSignature(d));
 assert.equal(r.candidate_pairs,1);assert.equal(r.verified_duplicates,0);
 assert.equal(r.candidates[0].merge_allowed,false);
});
test("different price or area is not matched",()=>{
 assert.equal(compareCrossPortalCards([m],[{...d,price_mad:8500}]).candidate_pairs,0);
 assert.equal(compareCrossPortalCards([m],[{...d,surface_m2:85}]).candidate_pairs,0);
});
test("incomplete fields or unqualified cards are excluded",()=>{
 assert.equal(compareCrossPortalCards([{...m,five_field_observed:false}],[d]).candidate_pairs,0);
 assert.equal(compareCrossPortalCards([m],[{...d,five_field_present:false}]).candidate_pairs,0);
});
test("multiple possible combinations stay separate and not auto-merged",()=>{
 const r=compareCrossPortalCards([m,{...m,identity:"a:3"}],[d,{...d,identity:"domio:4"}]);
 assert.equal(r.candidate_pairs,4);assert.equal(r.verified_duplicates,0);
 assert.ok(r.candidates.every(x=>x.merge_allowed===false));
});
