import test from "node:test";
import assert from "node:assert/strict";
import {slugifyDistrict,normalize,candidateDistricts,certifyDistrictShard,crawlVerifiedDistrictShards} from "../mubawab-district-derived-shards-v1.mjs";
const row=(id,district="Hay Mohammadi",city="Casablanca",intent="a-vendre")=>({
 identity:"a:"+id,canonical_url:"https://www.mubawab.ma/fr/a/"+id+"/x",city,district,price_mad:1300000,surface_m2:92,
 first_category:"https://www.mubawab.ma/fr/st/"+city.toLowerCase()+"/appartements-"+intent,
 five_field_observed:true
});
const h1='<h1>Immobilier à vendre - Hay Mohammadi, Casablanca</h1>';
const url="https://www.mubawab.ma/fr/cd/casablanca/hay-mohammadi/immobilier-a-vendre";
test("slug only from explicitly observed location and canonical source city",()=>{
 assert.equal(slugifyDistrict("Aïn Sebaâ"),"ain-sebaa");
 assert.equal(slugifyDistrict("Guéliz"),"gueliz");
 assert.equal(slugifyDistrict("Racine Extension"),"racine-extension");
 assert.equal(slugifyDistrict(""),null);
 const rows=[row(10001),row(10002),{...row(10003),city:"Rabat"}];
 const r=candidateDistricts(rows,10);
 assert.equal(r.candidate_count,1);
 assert.equal(r.selected[0].url,url);
 assert.equal(r.selected[0].observations,2);
});
test("candidate selection round-robins by city instead of starving smaller cities",()=>{
 const rows=[row(10001),row(10002,"Californie"),row(10003,"Racine"),row(10004,"Agdal","Rabat")];
 const r=candidateDistricts(rows,2);
 assert.equal(r.selected.length,2);
 assert.deepEqual(new Set(r.selected.map(x=>x.city)),new Set(["Casablanca","Rabat"]));
});
test("source page heading confirms district and municipality before cards can count",()=>{
 assert.equal(certifyDistrictShard("<body>"+h1+"</body>",url,{url,city:"Casablanca",district:"Hay Mohammadi"}).valid,true);
 assert.equal(certifyDistrictShard("<h1>Immobilier à vendre - Liberté, Casablanca</h1>",url,{url,city:"Casablanca",district:"Hay Mohammadi"}).valid,false);
 assert.equal(certifyDistrictShard("<h1>Immobilier à vendre - Hay Mohammadi, Rabat</h1>",url,{url,city:"Casablanca",district:"Hay Mohammadi"}).valid,false);
 assert.equal(certifyDistrictShard("<body>"+h1+"</body>","https://www.mubawab.ma/fr/a/999/foo",{url,city:"Casablanca",district:"Hay Mohammadi"}).valid,false);
});
test("read-only district crawl rejects unrelated recommended cards inside the same HTML",async()=>{
 const baseline=[row(10001)];
 const fetchImpl=async url=>({status:200,url,headers:{get:()=>"text/html"},text:async()=>"<html>"+h1+"</html>"});
 const parse=()=>({rows:[
 {identity:"a:10002",canonical_url:"https://www.mubawab.ma/fr/a/10002/x",city:"Casablanca",district:"Hay Mohammadi",price_mad:1400000,surface_m2:90,five_field_present:true},
 {identity:"a:10003",canonical_url:"https://www.mubawab.ma/fr/a/10003/y",city:"Casablanca",district:"Racine",price_mad:1500000,surface_m2:80,five_field_present:true}
 ],five_field_present:2});
 const {report,rows}=await crawlVerifiedDistrictShards({baselineRows:baseline,maxRequests:1,robotsText:"User-agent: *\nAllow: /",fetchImpl,parser:parse,paceMs:0});
 assert.equal(report.verified_district_pages,1);assert.equal(report.unique_source_ids,1);
 assert.equal(report.net_new_ids_vs_50,1);
 assert.equal(rows[0].identity,"a:10002");
 assert.equal(rows[0].freshness_certified,false);
});
test("denied robots prevents category fetching",async()=>{
 let called=0;
 const fetchImpl=async()=>{called++;throw Error("no fetch allowed");};
 const {report}=await crawlVerifiedDistrictShards({baselineRows:[row(10001)],maxRequests:1,robotsText:"User-agent: *\nDisallow: /",fetchImpl,paceMs:0});
 assert.equal(report.request_count,0);assert.equal(called,0);
});
test("429 stops the run and does not try other districts",async()=>{
 let calls=0;
 const fetchImpl=async url=>{calls++;return {status:429,url};};
 const {report}=await crawlVerifiedDistrictShards({baselineRows:[row(10001),row(10002,"Racine")],robotsText:"User-agent: *\nAllow: /",fetchImpl,paceMs:0,maxRequests:4});
 assert.equal(report.request_count,1);assert.equal(report.halted_reason,"http_429");assert.equal(calls,1);
});
