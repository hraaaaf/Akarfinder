import test from "node:test";
import assert from "node:assert/strict";
import {domioDetailIdentity,inspectDomioDetail,selectDomioSample,auditDomioDetails} from "../domio-card-detail-audit-v1.mjs";
const url="https://domio.ma/fr/appartement/vendre/casablanca/12358/appartement-marina";
const enriched="https://domio.ma/fr/appartement/vendre/casablanca/ain-diab/12358/appartement-marina";
const row={identity:"domio:12358",url,city:"Casablanca",district:"Ain Diab",price_mad:3337200,surface_m2:57,five_field_present:true};
const html='<html><body><h1>Appartement Marina</h1><div>Prix 3 337 200 DH ≈ 309 000 €</div><div>Surface 57.0 m²</div><div>Référence DOM-12358</div><p>Publié le 26/09/2026</p><div>Prix 3 337 200 DH</div></body></html>';
test("canonical destination may add district without changing source identity",()=>{
 assert.equal(domioDetailIdentity(url),"domio:12358");
 assert.equal(domioDetailIdentity(enriched),"domio:12358");
 assert.equal(domioDetailIdentity("https://evil.example/fr/appartement/vendre/casablanca/12358/appartement"),null);
});
test("source reference, price, surface and publication date must be explicit",()=>{
 const r=inspectDomioDetail(html,url,enriched,row);
 assert.equal(r.primary_detail_verified,true);
 assert.equal(r.price_matches_card,true);
 assert.equal(r.surface_matches_card,true);
 assert.equal(r.published_at_observed,"2026-09-26");
 assert.equal(r.freshness_certified,false);
});
test("wrong DOM reference or changed ID cannot pass gate",()=>{
 assert.equal(inspectDomioDetail(html.replace("DOM-12358","DOM-555"),url,enriched,row).primary_detail_verified,false);
 assert.equal(inspectDomioDetail(html,url,enriched.replace("12358","12359"),row).identity_preserved,false);
});
test("conflicting repeated field values do not choose first",()=>{
 const mismatch=html.replace("Prix 3 337 200 DH</div>","Prix 3 337 200 DH</div><p>Prix 4 000 000 DH</p>");
 const r=inspectDomioDetail(mismatch,url,enriched,row);
 assert.equal(r.price_matches_card,null);
 assert.equal(r.ambiguous_fields,true);
});
test("deterministic sample excludes incomplete cards",()=>{
 const rows=[row,{...row,identity:"domio:12359",url:url.replace("12358","12359"),city:"Marrakech"},{...row,identity:"domio:12360",url:url.replace("12358","12360"),five_field_present:false}];
 const selected=selectDomioSample(rows,2);
 assert.equal(selected.length,2);assert.equal(selected.some(x=>x.identity==="domio:12360"),false);
});
test("robots denial and 429 are respected",async()=>{
 let requests=0;
 const fetchImpl=async url=>{requests++;return {status:429,url};};
 const denied=await auditDomioDetails({rows:[row],robotsText:"User-agent: *\nDisallow: /fr/",fetchImpl,paceMs:0});
 assert.equal(denied.report.detail_requests,0);
 const halted=await auditDomioDetails({rows:[row],robotsText:"User-agent: *\nAllow: /",fetchImpl,paceMs:0});
 assert.equal(halted.report.halted_reason,"http_429");assert.equal(requests,1);
});
