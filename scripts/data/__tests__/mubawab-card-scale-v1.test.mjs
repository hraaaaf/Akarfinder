import test from "node:test";
import assert from "node:assert/strict";
import {categoryPlan,isSameCategoryRoute,accumulateCards,acquireResultCards} from "../mubawab-card-scale-v1.mjs";
const sample={url:"https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre",city:"Casablanca",type:"appartements",transaction:"a-vendre"};
const sample2={...sample,url:"https://www.mubawab.ma/fr/st/casablanca/appartements-a-louer",transaction:"a-louer"};
const card=(identity,price=1500000,district="Maârif")=>({identity,canonical_url:"https://www.mubawab.ma/fr/a/"+identity.split(":")[1]+"/appart",
 city:"Casablanca",district,price_mad:price,surface_m2:95,five_field_present:true});
const fakeResult=(rows)=>({rows,five_field_present:rows.length,raw_detail_anchors:rows.length,rejected_mixed:0});

test("fifty unique deterministic city/type/transaction categories",()=>{
 const p=categoryPlan();
 assert.equal(p.length,50);assert.equal(new Set(p.map(x=>x.url)).size,50);
 assert.equal(new Set(p.map(x=>x.city)).size,5);
 assert.deepEqual(new Set(p.map(x=>x.transaction)),new Set(["a-vendre","a-louer"]));
 assert.equal(categoryPlan({maxPages:8}).length,8);
});
test("refuse different route, foreign host and changed query destinations",()=>{
 assert.equal(isSameCategoryRoute(sample.url,sample.url),true);
 assert.equal(isSameCategoryRoute(sample.url,"https://www.mubawab.ma/fr/a/812345/foo"),false);
 assert.equal(isSameCategoryRoute(sample.url,sample.url+"?foo=1"),false);
 assert.equal(isSameCategoryRoute(sample.url,"https://evil.example/fr/st/casablanca/appartements-a-vendre"),false);
});
test("deduplicate same source identity across different categories",()=>{
 const merged=accumulateCards([{seed:sample,rows:[card("a:8101000")]},{seed:sample2,rows:[card("a:8101000")]}]);
 assert.equal(merged.unique,1);assert.equal(merged.complete,1);assert.equal(merged.duplicates,1);
 assert.equal(merged.rows[0].observation_count,2);
 assert.equal(merged.rows[0].freshness_certified,false);
});
test("conflicting prices fail safe across cards instead of first value winning",()=>{
 const merged=accumulateCards([{seed:sample,rows:[card("a:8101000")]},{seed:sample2,rows:[card("a:8101000",1800000)]}]);
 assert.equal(merged.conflict_rows,1);assert.equal(merged.complete,0);
 assert.equal(merged.rows[0].price_mad,null);
 assert.deepEqual(merged.rows[0].cross_page_conflicts,["price_mad"]);
});
test("missing later observation does not clear a backed field",()=>{
 const missing={...card("a:8101000"),surface_m2:null};
 const merged=accumulateCards([{seed:sample,rows:[card("a:8101000")]},{seed:sample2,rows:[missing]}]);
 assert.equal(merged.complete,1);
});
test("explicit card location gate prevents category-only city inference",()=>{
 const row={...card("a:8101000"),district:null};
 const merged=accumulateCards([{seed:sample,rows:[row]}]);
 assert.equal(merged.rows[0].city,null);
 assert.equal(merged.complete,0);
});
test("robots disallow prevents any category requests",async()=>{
 const calls=[];
 const fetchImpl=async url=>{calls.push(url);throw Error("listing fetch must not occur");};
 const {report}=await acquireResultCards({pages:[sample],robotsText:"User-agent: *\nDisallow: /fr/st/",fetchImpl,paceMs:0});
 assert.equal(report.request_count,0);assert.equal(report.observed_page_count,0);assert.equal(calls.length,0);
});
test("crawler observes cards without visiting detail pages, and computes freeze newness",async()=>{
 const calls=[];
 const fetchImpl=async url=>{calls.push(url);return {status:200,url,headers:{get:()=> "text/html"},text:async()=>"<html>cards</html>"};};
 const parser=()=>fakeResult([card("a:8101000"),card("a:8101001")]);
 const {report,rows}=await acquireResultCards({pages:[sample,sample2],robotsText:"User-agent: *\nAllow: /",fetchImpl,parser,paceMs:0,existingIds:new Set(["a:8101000"])});
 assert.equal(report.request_count,2);assert.equal(report.observed_page_count,2);
 assert.equal(report.unique_source_id_count,2);assert.equal(report.duplicate_observations,2);
 assert.equal(report.net_new_source_ids_vs_freeze,1);
 assert.equal(report.net_new_five_field_vs_freeze,1);
 assert.equal(rows.length,2);
 assert.equal(calls.every(url=>!url.includes("/fr/a/")),true);
});
test("429 stops immediately with no subsequent requests",async()=>{
 const calls=[];
 const fetchImpl=async url=>{calls.push(url);return {status:429,url,headers:{get:()=> "text/html"},text:async()=>""};};
 const {report}=await acquireResultCards({pages:[sample,sample2],robotsText:"User-agent: *\nAllow: /",fetchImpl,paceMs:0});
 assert.equal(report.halted_reason,"http_429");assert.equal(report.request_count,1);assert.equal(calls.length,1);
});
test("redirected category cannot silently assign the wrong city",async()=>{
 const fetchImpl=async url=>({status:200,url:"https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre",headers:{get:()=> "text/html"},text:async()=>"<html></html>"});
 const {report}=await acquireResultCards({pages:[sample],robotsText:"User-agent: *\nAllow: /",fetchImpl,paceMs:0,parser:()=>{throw Error("must not parse redirected page");}});
 assert.equal(report.unique_source_id_count,0);assert.equal(report.pages[0].state,"redirected_out_of_category");
});
test("failed robots fetch halts without category traffic",async()=>{
 const seen=[];
 const fetchImpl=async url=>{seen.push(url);return {status:503,url,headers:{get:()=> "text/plain"},text:async()=>""};};
 const {report}=await acquireResultCards({pages:[sample],fetchImpl,paceMs:0});
 assert.equal(report.halted_reason,"robots_unavailable_fail_closed");
 assert.deepEqual(seen,["https://www.mubawab.ma/robots.txt"]);
});
