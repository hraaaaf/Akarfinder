import test from "node:test";
import assert from "node:assert/strict";
import {extractSaroutyResultCards as parse} from "../sarouty-result-cards-v1.mjs";
const url="https://www.sarouty.ma/acheter/casablanca/appartements-a-vendre/";
const one='<article class="property-card"><a href="/acheter/appartement-casablanca-racine-908416/">Appartement à vendre</a><div class="price">1 200 000 DH</div><div class="area">95 m²</div><div class="location">Racine, Casablanca</div></article>';
const two='<article class="property-card"><a href="/acheter/appartement-casablanca-maarif-908417/">Appartement à vendre</a><div class="price">970 000 DH</div><span>80 m²</span><div class="location">Casablanca, Maarif</div></article>';
test("individual result cards yield exactly matched IDs and 5 fields",()=>{
 const r=parse(one+two,url,"Casablanca");
 assert.equal(r.isolated_ids,2);assert.equal(r.five_field_observed,2);
 assert.deepEqual(r.rows.map(x=>x.identity),["sarouty:908416","sarouty:908417"]);
 assert.deepEqual(r.rows.map(x=>x.price_mad),[1200000,970000]);
 assert.deepEqual(r.rows.map(x=>x.district),["Racine","Maarif"]);
 assert.ok(r.rows.every(x=>x.freshness_certified===false&&x.active_detail_verified===false));
});
test("two IDs in same wrapper are rejected without mixing the fields",()=>{
 const html='<article class="property-card"><a href="/acheter/appartement-casablanca-racine-908416/">A</a><a href="/acheter/appartement-casablanca-maarif-908417/">B</a><div>1 000 000 DH</div><div>80 m²</div></article>';
 const r=parse(html,url,"Casablanca");
 assert.equal(r.five_field_observed,0);assert.equal(r.isolated_ids,0);
});
test("no district evidence means city cannot be inferred from category",()=>{
 const r=parse(one.replace('<div class="location">Racine, Casablanca</div>',''),url,"Casablanca");
 assert.equal(r.isolated_ids,1);assert.equal(r.rows[0].city,null);assert.equal(r.five_field_observed,0);
});
test("contradictory prices inside same card are not certified",()=>{
 const r=parse(one.replace('1 200 000 DH','1 200 000 DH, 2 200 000 DH'),url,"Casablanca");
 assert.equal(r.isolated_ids,1);assert.equal(r.rows[0].price_mad,null);
 assert.equal(r.rows[0].price_ambiguous,true);assert.equal(r.five_field_observed,0);
});
test("foreign and catalog links are not real individual source IDs",()=>{
 const html='<article class="property-card"><a href="https://example.com/acheter/appartement-casablanca-racine-908416/">Fake</a><a href="/acheter/casablanca/appartements-a-vendre/">Category</a><span>1 000 000 DH 85 m²</span></article>';
 assert.equal(parse(html,url,"Casablanca").isolated_ids,0);
});
test("identical listing anchors de-duplicate by source identity",()=>{
 const r=parse(one+one,url,"Casablanca");
 assert.equal(r.isolated_ids,1);
});
test("per square meter price is not a total price",()=>{
 const r=parse(one.replace('1 200 000 DH','13 000 DH/m²'),url,"Casablanca");
 assert.equal(r.rows[0].price_mad,null);
});
