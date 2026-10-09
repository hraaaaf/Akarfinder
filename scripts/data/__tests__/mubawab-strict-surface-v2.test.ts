import test from "node:test";
import assert from "node:assert/strict";
import { extractMubawabStrictSurface } from "../mubawab-strict-surface-v2.js";

test("accepts explicit labeled Surface DOM",()=>{
 const html='<ul class="blockDetails"><li><span class="titreFiche">Surface</span><span class="titreFicheValue">120 m²</span></li></ul>';
 assert.deepEqual(extractMubawabStrictSurface(html),{value:120,evidence:"mubawab_labeled_surface_dom",confidence:"high"});
});
test("accepts explicit Superficie label",()=>{
 const html='<div class="ficheDetails"><li><span class="label">Superficie</span><span class="value">85 m2</span></li></div>';
 assert.equal(extractMubawabStrictSurface(html)?.value,85);
});
test("rejects unlabeled recommendation/noise surface",()=>{
 assert.equal(extractMubawabStrictSurface('<body>Appartement similaire 130 m²</body>'),null);
});
test("rejects plot surface as main surface",()=>{
 const html='<li><span class="label">Surface terrain</span><span class="value">500 m²</span></li>';
 assert.equal(extractMubawabStrictSurface(html),null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { extractMubawabStrictSurface } from "../mubawab-strict-surface-v2.js";
test("primary blockProp labeled surface excludes related cards",()=>{
 const html='<div class="blockProp"><h1 class="searchTitle">Appartement 120 m²</h1><p>Surface 120 m²</p></div><div class="dataRelat"><span>900 m²</span></div><div class="contentBox"><p class="listingP descLi">Surface 500 m²</p></div>';
 assert.equal(extractMubawabStrictSurface(html)?.value,120);
});
test("rejects ambiguous primary blockProp surfaces",()=>{
 const html='<div class="blockProp"><h1 class="searchTitle">Appartement</h1><p>Surface 120 m²</p><p>Superficie 140 m²</p></div>';
 assert.equal(extractMubawabStrictSurface(html),null);
});
test("does not accept adDetailFeature related card without primary block",()=>{
 assert.equal(extractMubawabStrictSurface('<div class="adDetailFeature"><span>120 m²</span></div>'),null);
});
