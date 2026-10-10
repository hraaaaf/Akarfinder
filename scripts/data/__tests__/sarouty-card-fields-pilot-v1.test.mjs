import test from "node:test";
import assert from "node:assert/strict";
import {runSaroutyCardFieldPilot,SEEDS} from "../sarouty-card-fields-pilot-v1.mjs";
const row=id=>({identity:"sarouty:"+id,source:"sarouty.ma",canonical_url:"https://www.sarouty.ma/acheter/appartement-casablanca-"+id+"/",city:"Casablanca",district:"Racine",price_mad:1200000,surface_m2:95,five_field_observed:true,freshness_certified:false});
test("six categories maximum with geographically grounded source URLs",()=>{
 assert.equal(SEEDS.length,6);
 assert.equal(new Set(SEEDS.map(x=>x.url)).size,6);
});
test("valid robots and 10-second cadence yield deduplicated IDs without detail requests",async()=>{
 const fetched=[],delays=[];
 const fetchImpl=async url=>{fetched.push(url);return {status:200,url,headers:{get:()=>"text/html"},text:async()=>"<html></html>"};};
 const parser=()=>({link_candidates:1,isolated_ids:1,five_field_observed:1,price_present:1,surface_present:1,district_present:1,rows:[row(908416)]});
 const {report,rows}=await runSaroutyCardFieldPilot({robotsText:"User-agent: *\nCrawl-delay: 10\nAllow: /",seeds:SEEDS.slice(0,2),fetchImpl,parser,sleep:ms=>delays.push(ms)});
 assert.equal(report.category_requests,2);assert.deepEqual(delays,[10000]);
 assert.equal(report.source_ids_observed,1);assert.equal(report.five_field_observed,1);
 assert.equal(rows[0].freshness_certified,false);
 assert.equal(fetched.every(x=>!x.includes("/908416/")),true);
});
test("robots disallow means zero fetches",async()=>{
 let n=0;
 const r=await runSaroutyCardFieldPilot({robotsText:"User-agent: *\nDisallow: /acheter/\nCrawl-delay: 10",seeds:SEEDS.slice(0,2),fetchImpl:()=>{n++;throw Error("should not fetch");}});
 assert.equal(r.report.category_requests,0);assert.equal(n,0);
});
test("429 stop after first category",async()=>{
 let n=0;
 const r=await runSaroutyCardFieldPilot({robotsText:"User-agent: *\nAllow: /\nCrawl-delay: 10",seeds:SEEDS.slice(0,2),fetchImpl:url=>{n++;return {status:429,url};}});
 assert.equal(r.report.stopped_early,"http_429");assert.equal(n,1);
});
test("redirect to another category yields no source rows",async()=>{
 const fetchImpl=async url=>({status:200,url:SEEDS[1].url,headers:{get:()=>"text/html"},text:async()=>"<html></html>"});
 const r=await runSaroutyCardFieldPilot({robotsText:"User-agent: *\nAllow: /",seeds:SEEDS.slice(0,1),fetchImpl});
 assert.equal(r.report.source_ids_observed,0);
 assert.equal(r.report.pages[0].state,"redirect_or_untrusted_host");
});
