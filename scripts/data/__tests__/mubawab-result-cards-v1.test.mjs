import test from "node:test";
import assert from "node:assert/strict";
import {extractMubawabResultCards,robotsAllowed} from "../mubawab-result-cards-v1.mjs";
const page="https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre";
const first='<li class="listingBox"><div class="priceTag">1 460 000 DH</div><a href="/fr/a/8391101/appartement"><h2>Appartement à vendre</h2></a><div class="listingH3">Californie, Casablanca</div><div class="adDetailFeature">96 m²</div><p class="descLi">Près de 500 m² et au prix de 2 000 000 DH.</p></li>';
const second='<li class="listingBox"><span>750 000 DH</span><a href="/fr/a/8391102/autre"><h3>Appartement moderne</h3></a><span class="location">Oulfa, Casablanca</span><span>70 m²</span></li>';
test("two independent listing cards expose five fields without details",()=>{
 const r=extractMubawabResultCards('<ul>'+first+second+'</ul>',page,"Casablanca");
 assert.equal(r.five_field_present,2);
 assert.deepEqual(r.rows.map(x=>x.identity),["a:8391101","a:8391102"]);
 assert.deepEqual(r.rows.map(x=>x.price_mad),[1460000,750000]);
 assert.deepEqual(r.rows.map(x=>x.district),["Californie","Oulfa"]);
 assert.ok(r.rows.every(x=>x.state==="observed_review_not_current_or_fresh_certified"));
});
test("multiple unrelated links inside one container cannot become a card",()=>{
 const html='<div><a href="/fr/a/8391101/foo">A</a><a href="/fr/a/8391102/bar">B</a><span>Californie, Casablanca</span><span>80 m²</span><span>1 000 000 DH</span></div>';
 const r=extractMubawabResultCards(html,page,"Casablanca");
 assert.equal(r.five_field_present,0);
});
test("multiple contradictory prices and surfaces are rejected",()=>{
 const html='<li class="listingBox"><a href="/fr/a/8391101/foo"><h2>Appartement</h2></a><span>Californie, Casablanca</span><span>1 000 000 DH</span><span>2 000 000 DH</span><span>80 m²</span><span>95 m²</span></li>';
 const r=extractMubawabResultCards(html,page,"Casablanca");
 assert.equal(r.five_field_present,0);
 assert.equal(r.rows[0].conflicts.price,true);
 assert.equal(r.rows[0].conflicts.surface,true);
});
test("project is excluded from individual listing candidate count",()=>{
 const html='<li class="listingBox"><a href="/fr/pa/8391101/projet">Project</a><span>1 000 000 DH</span><span>80 m²</span><span>Californie, Casablanca</span></li>';
 assert.equal(extractMubawabResultCards(html,page,"Casablanca").cards,0);
});
test("external domain cannot masquerade as Mubawab",()=>{
 const html='<li class="listingBox"><a href="https://notmubawab.ma/fr/a/8391101/foo">Fake</a><span>1 000 000 DH</span><span>80 m²</span><span>Californie, Casablanca</span></li>';
 assert.equal(extractMubawabResultCards(html,page,"Casablanca").cards,0);
});
test("district cannot be inferred from page city alone",()=>{
 const html='<li class="listingBox"><a href="/fr/a/8391101/foo"><h2>Studio</h2></a><span>Casablanca</span><span>1 000 000 DH</span><span>80 m²</span></li>';
 const r=extractMubawabResultCards(html,page,"Casablanca");
 assert.equal(r.rows[0].district,null);assert.equal(r.five_field_present,0);
});
test("robots wildcard disallow and independent allow are observed",()=>{
 const robots='User-agent: *\nDisallow: /login\nDisallow: /*:\nDisallow: /*?n=1\nAllow: /fr/st/';
 assert.equal(robotsAllowed(robots,page),true);
 assert.equal(robotsAllowed(robots,page+':p:2'),false);
 assert.equal(robotsAllowed(robots,page+'?n=1'),false);
});
test("robots disallow all is respected",()=>{
 assert.equal(robotsAllowed('User-agent: *\nDisallow: /',page),false);
});
