import test from "node:test";import assert from "node:assert/strict";
import {probeMubawabSurfaceDom} from "../mubawab-surface-dom-probe-v2.js";
test("records only surface values and DOM attributes, never arbitrary listing text",()=>{
 const result=probeMubawabSurfaceDom('<html><body><main class="listing"><ul class="features"><li class="size">Surface 120 m² contact 0612345678</li></ul><aside><p>terrain 400 m2</p></aside></main></body></html>');
 assert.equal(result.surface_leaf_occurrences,2);
 assert.deepEqual(result.surface_leaf_structures.map((x:any)=>x.value),[120,400]);
 assert.equal(JSON.stringify(result).includes("0612345678"),false);
 assert.equal(result.surface_leaf_structures[0].element.classes,"size");
});
test("rejects generic text with no square-metre unit",()=>assert.equal(probeMubawabSurfaceDom('<body><p>Villa 120 dh</p></body>').surface_leaf_occurrences,0));
