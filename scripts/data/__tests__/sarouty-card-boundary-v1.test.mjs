import test from "node:test";
import assert from "node:assert/strict";
import {inspectSaroutyCardBoundaries as inspect} from "../sarouty-card-boundary-v1.mjs";
const page="https://www.sarouty.ma/acheter/casablanca/appartements-a-vendre/";
test("profiles contain counts and CSS classes, no property text, URLs or IDs",()=>{
 const html='<main><div class="listing"><article class="property-card"><a href="/acheter/appartement-casablanca-racine-908416/">Maison 1 200 000 DH 95 m²</a></article></div></main>';
 const r=inspect(html,page);
 assert.equal(r.profiles.length,1);
 assert.equal(r.profiles[0].parents[0].source_ids_in_subtree,1);
 assert.equal(r.profiles[0].parents[0].price_pattern,true);
 assert.equal(r.profiles[0].parents[0].surface_pattern,true);
 assert.equal(JSON.stringify(r).includes("908416"),false);
 assert.equal(JSON.stringify(r).includes("1 200 000"),false);
 assert.equal(JSON.stringify(r).includes("sarouty.ma"),false);
});
test("mixed parent detected through two listing identities in same ancestor",()=>{
 const html='<div class="grid"><article><a href="/acheter/appartement-casablanca-racine-908416/">1 200 000 DH 95 m²</a></article><article><a href="/acheter/appartement-rabat-hassan-908417/">900 000 DH 80 m²</a></article></div>';
 const r=inspect(html,page);
 assert.equal(r.profiles.length,2);
 assert.ok(r.profiles[0].parents.some(p=>p.source_ids_in_subtree===2));
});
test("no leak from other domains or category links",()=>{
 const html='<div><a href="https://evil.example/acheter/appartement-rabat-hassan-908417/">Contact</a><a href="/acheter/rabat/appartements-a-vendre/">Page</a></div>';
 assert.equal(inspect(html,page).profiles.length,0);
});
