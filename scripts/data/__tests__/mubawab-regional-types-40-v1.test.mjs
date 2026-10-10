import test from "node:test";
import assert from "node:assert/strict";
import {regionalTypeMatrix,runRegionalTypeMatrix} from "../mubawab-regional-types-40-v1.mjs";
test("40 deterministic source-candidate category URLs across four real cities",()=>{
 const rows=regionalTypeMatrix();
 assert.equal(rows.length,40);assert.equal(new Set(rows.map(x=>x.url)).size,40);
 assert.equal(rows.filter(x=>x.city==="Fès").length,10);
 assert.equal(rows.filter(x=>x.city==="Kénitra").length,10);
 assert.ok(rows.some(x=>x.url.includes("t%C3%A9touan/villas-et-maisons-de-luxe-a-louer")));
 assert.ok(rows.some(x=>x.url.endsWith("/nador/bureaux-et-commerces-a-vendre")));
});
test("explicit listing location required even for candidate category URL",async()=>{
 const page=regionalTypeMatrix()[0];
 const html='<li class="listingBox"><a href="/fr/a/8400200/annonce"><h2>Appartement</h2></a><div>800 000 DH</div><span>90 m²</span><div>Fès</div></li>';
 const fetchImpl=async url=>({status:200,url,headers:{get:()=>"text/html"},text:async()=>html});
 const {report,rows}=await runRegionalTypeMatrix({pages:[page],fetchImpl,robotsText:"User-agent: *\nAllow: /",sleep:()=>{},baselineIds:new Set()});
 assert.equal(report.unique_source_id_count,1);assert.equal(rows[0].five_field_observed,false);
});
test("403 stops immediately without trying subsequent categories",async()=>{
 let n=0;
 const fetchImpl=async url=>{n++;return {status:403,url,headers:{get:()=>""}};};
 const r=await runRegionalTypeMatrix({pages:regionalTypeMatrix().slice(0,2),fetchImpl,robotsText:"User-agent: *\nAllow: /",sleep:()=>{}});
 assert.equal(r.report.halted_reason,"http_403");assert.equal(n,1);
});
test("robots disallow all source category requests",async()=>{
 let n=0;const fetchImpl=async()=>{n++;throw Error("must not fetch");};
 const r=await runRegionalTypeMatrix({pages:regionalTypeMatrix().slice(0,2),fetchImpl,robotsText:"User-agent: *\nDisallow: /fr/st/"});
 assert.equal(r.report.request_count,0);assert.equal(n,0);
});
