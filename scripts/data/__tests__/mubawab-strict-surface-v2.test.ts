import test from "node:test";
import assert from "node:assert/strict";
import { extractMubawabStrictSurface,inspectMubawabStrictSurface,hasMubawabPrimaryDetail } from "../mubawab-strict-surface-v2.js";

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

test("accepts primary adDetails span when title does not contain m2",()=>{
 const html='<div class="col-8"><div class="blockProp"><h1 class="searchTitle">Studio meublé à vendre</h1></div><div class="disFlex adDetails"><div class="adDetailFeature"><span>97 m²</span></div></div></div><div class="contentBox"><div class="disFlex adDetails"><div class="adDetailFeature"><span>350 m²</span></div></div></div><div class="dataRelat"><span>600 m²</span></div>';
 assert.equal(hasMubawabPrimaryDetail(html),true);
 assert.deepEqual(extractMubawabStrictSurface(html),{value:97,evidence:"mubawab_primary_blockProp_or_col8_features",confidence:"high"});
});
test("rejects search results with adDetailFeature but no primary h1",()=>{
 const html='<div class="col-8"><h2 class="listingTit">Appartement</h2><div class="disFlex adDetails"><div class="adDetailFeature"><span>97 m²</span></div></div></div>';
 assert.equal(hasMubawabPrimaryDetail(html),false);
 assert.equal(extractMubawabStrictSurface(html),null);
});
test("rejects disagreement between primary labeled surface and primary features",()=>{
 const html='<div class="col-8"><div class="blockProp"><h1 class="searchTitle">Surface 120 m²</h1></div><div class="disFlex adDetails"><div class="adDetailFeature"><span>97 m²</span></div></div></div>';
 assert.equal(extractMubawabStrictSurface(html),null);
});
test("rejects multiple different primary adDetails surface values",()=>{
 const html='<div class="col-8"><div class="blockProp"><h1 class="searchTitle">Vente terrain</h1></div><div class="disFlex adDetails"><div class="adDetailFeature"><span>97 m²</span></div><div class="adDetailFeature"><span>101 m²</span></div></div></div>';
 assert.equal(extractMubawabStrictSurface(html),null);
});
test("rejects duplicate or ambiguous blockProp primary markers",()=>{
 const html='<div class="col-8"><div class="blockProp"><h1 class="searchTitle">Appart 97</h1></div><div class="blockProp"><h1 class="searchTitle">Appart 130</h1></div><div class="disFlex adDetails"><div class="adDetailFeature"><span>97 m²</span></div></div></div>';
 assert.equal(hasMubawabPrimaryDetail(html),false);
 assert.equal(extractMubawabStrictSurface(html),null);
});

test("flags ambiguous primary DOM, not merely null surface",()=>{
 const html='<div class="col-8"><div class="blockProp"><h1 class="searchTitle">Villa</h1><p>Surface 120 m² et superficie 150 m²</p></div></div>';
 assert.deepEqual(inspectMubawabStrictSurface(html),{surface:null,conflict:true});
});
test("flags ambiguity within one adDetailFeature span",()=>{
 const html='<div class="col-8"><div class="blockProp"><h1 class="searchTitle">Villa</h1></div><div class="adDetails"><div class="adDetailFeature"><span>120 m² et 150 m²</span></div></div></div>';
 assert.deepEqual(inspectMubawabStrictSurface(html),{surface:null,conflict:true});
});
test("flags disagreement between main value and labeled list",()=>{
 const html='<div class="col-8"><div class="blockProp"><h1 class="searchTitle">Villa</h1><p>Surface 120 m²</p></div><ul class="blockDetails"><li><span class="titreFiche">Surface</span><span class="titreFicheValue">150 m²</span></li></ul></div>';
 assert.deepEqual(inspectMubawabStrictSurface(html),{surface:null,conflict:true});
});
test("does not confuse related-card labels with main listing",()=>{
 const html='<div class="col-8"><div class="blockProp"><h1 class="searchTitle">Villa</h1><p>Surface 120 m²</p></div></div><ul class="blockDetails contentBox"><li><span class="titreFiche">Surface</span><span class="titreFicheValue">150 m²</span></li></ul>';
 assert.equal(extractMubawabStrictSurface(html)?.value,120);
});
