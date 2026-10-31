import test from "node:test";
import assert from "node:assert/strict";
import {crawlVerifiedDistrictShards,candidateDistricts} from "../mubawab-district-remainder-v1.mjs";
const city="Casablanca";
const seed=(i)=>({identity:"a:"+(8000000+i),first_category:"https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre",
 city,district:"Test District "+i,price_mad:1900000,surface_m2:95,canonical_url:"https://www.mubawab.ma/fr/a/"+(8000000+i)+"/x"});
const baseline=Array.from({length:125},(_,i)=>seed(i));
const html=(district)=>'<h1>Immobilier à vendre - '+district+', Casablanca</h1>';
test("remainder offset precisely skips first 120 source-derived shards",async()=>{
 const all=candidateDistricts(baseline,500).selected;
 assert.equal(all.length,125);
 const calls=[];
 const fetchImpl=async url=>{calls.push(url);const district=all.find(x=>x.url===url)?.district||"";return {status:200,url,headers:{get:()=>"text/html"},text:async()=>html(district)};};
 const parser=()=>({rows:[],five_field_present:0});
 const {report}=await crawlVerifiedDistrictShards({baselineRows:baseline,offset:120,maxRequests:15,paceMs:0,
  priorIds:new Set(),fetchImpl,parser,robotsText:"User-agent: *\nAllow: /"});
 assert.equal(report.selected_offset,120);
 assert.equal(report.selected_candidates,5);
 assert.deepEqual(calls,all.slice(120).map(x=>x.url));
});
test("prior ids are excluded independently from original seed ids",async()=>{
 const baseline=[seed(1),seed(2),seed(3)];
 const route=candidateDistricts(baseline,500).selected[1];
 const row={identity:"a:9999001",city, district:route.district, price_mad:1900000,surface_m2:95,
  canonical_url:"https://www.mubawab.ma/fr/a/9999001/x",five_field_present:true};
 const f=async url=>({status:200,url,headers:{get:()=>"text/html"},text:async()=>html(route.district)});
 const {report}=await crawlVerifiedDistrictShards({baselineRows:baseline,offset:1,maxRequests:1,fetchImpl:f,
  parser:()=>({rows:[row],five_field_present:1}),priorIds:new Set(["a:9999001"]),robotsText:"User-agent: *\nAllow: /",paceMs:0});
 assert.equal(report.unique_source_ids,1);
 assert.equal(report.net_new_ids_vs_50,1);
 assert.equal(report.net_new_ids_vs_50_and_first120,0);
 assert.equal(report.net_new_five_field_vs_50_and_first120,0);
});
test("429 halts remainder without false claim",async()=>{
 const f=async url=>({status:429,url});
 const {report}=await crawlVerifiedDistrictShards({baselineRows:baseline,offset:120,maxRequests:5,fetchImpl:f,
  robotsText:"User-agent: *\nAllow: /",paceMs:0});
 assert.equal(report.halted_reason,"http_429");assert.equal(report.request_count,1);
});
test("robots disallow remains fail closed",async()=>{
 let n=0;
 const f=async()=>{n++;throw Error("forbidden");};
 const {report}=await crawlVerifiedDistrictShards({baselineRows:baseline,offset:120,maxRequests:5,fetchImpl:f,
  robotsText:"User-agent: *\nDisallow: /",paceMs:0});
 assert.equal(report.request_count,0);assert.equal(n,0);
});
