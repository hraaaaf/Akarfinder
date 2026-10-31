import test from "node:test";
import assert from "node:assert/strict";
import {sampleObservedCards,inspectMubawabDetail,runDetailCanary} from "../mubawab-card-detail-audit-v1.js";
const card=(id,city="Casablanca")=>({identity:"a:"+id,canonical_url:"https://www.mubawab.ma/fr/a/"+id+"/sample",
 city,district:"Maârif",price_mad:1200000,surface_m2:85,five_field_observed:true,possible_cross_id_duplicate:false});
const html='<div class="col-8"><div class="blockProp"><h1 class="searchTitle">Appartement</h1><p>Surface 85 m²</p></div></div>';
test("stratifies sample deterministically and excludes cards lacking mandatory evidence",()=>{
 const rows=[card(1),card(2),card(3,"Rabat"),{...card(4),possible_cross_id_duplicate:true},{...card(5),district:null}];
 const a=sampleObservedCards(rows,3),b=sampleObservedCards(rows,3);
 assert.deepEqual(a,b);assert.equal(a.length,3);assert.equal(a.some(r=>r.identity==="a:4"||r.identity==="a:5"),false);
});
test("matching primary page demonstrates identity without claiming freshness",()=>{
 const row=card(1234567);
 const x=inspectMubawabDetail(html,row.canonical_url,row.canonical_url,row,200);
 assert.equal(x.primary_detail_verified,true);
 assert.equal(x.strict_surface_matches_card,true);
 assert.equal(x.freshness_certified,false);
});
test("redirected listing cannot pass identity gate",()=>{
 const row=card(1234567);
 const x=inspectMubawabDetail(html,row.canonical_url,"https://www.mubawab.ma/fr/a/7654321/other",row,200);
 assert.equal(x.identity_preserved,false);assert.equal(x.primary_detail_verified,false);
});
test("different primary surface is recorded as discrepancy",()=>{
 const row=card(1234567);
 const x=inspectMubawabDetail(html.replace("85 m²","95 m²"),row.canonical_url,row.canonical_url,row,200);
 assert.equal(x.strict_surface_matches_card,false);
});
test("robots disallow prevents detail requests",async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;throw Error("should not fetch");};
 const {report}=await runDetailCanary({rows:[card(1234567)],robotsText:"User-agent: *\nDisallow: /fr/a/",fetchImpl,paceMs:0});
 assert.equal(report.detail_requests,0);assert.equal(calls,0);
});
test("429 halts sampled requests immediately",async()=>{
 let calls=0;
 const fetchImpl=async url=>{calls++;return {status:429,url,headers:{get:()=>"text/html"},text:async()=>""};};
 const {report}=await runDetailCanary({rows:[card(1234567),card(1234568)],robotsText:"User-agent: *\nAllow: /",fetchImpl,paceMs:0});
 assert.equal(report.halted_reason,"http_429");assert.equal(calls,1);
});
