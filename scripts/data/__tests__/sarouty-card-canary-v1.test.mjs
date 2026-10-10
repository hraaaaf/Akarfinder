import test from "node:test";
import assert from "node:assert/strict";
import {saroutyCrawlDelay,probeSaroutyCards,runSaroutyCanary} from "../sarouty-card-canary-v1.mjs";

test("source robots ten-second crawl-delay is mandatory",()=>{
 const robots="User-agent: *\nDisallow: /wp-admin/\nCrawl-delay: 10\n";
 assert.equal(saroutyCrawlDelay(robots),10);
});
test("card-like anchor with price and surface is only a candidate, not certified listing",()=>{
 const html='<article><a href="/acheter/appartement-casablanca-racine-908416/">Villa 1 200 000 DH 95 m² à vendre</a></article>';
 const r=probeSaroutyCards(html,"https://www.sarouty.ma/acheter/casablanca/appartements-a-vendre/");
 assert.equal(r.distinct_card_link_evidence,1);
 assert.equal(r.five_fields_certified,0);
});
test("robots denial stops category requests",async()=>{
 let n=0;
 const fetchImpl=async()=>{n++;throw Error("should not request categories");};
 const r=await runSaroutyCanary({fetchImpl,robotsText:"User-agent: *\nDisallow: /\nCrawl-delay: 10"});
 assert.equal(r.category_requests,0);assert.equal(n,0);
});
test("403 stops after one request without bypass",async()=>{
 let n=0;const fetchImpl=async url=>{n++;return {status:403,url};};
 const r=await runSaroutyCanary({fetchImpl,robotsText:"User-agent: *\nAllow: /\nCrawl-delay: 10"});
 assert.equal(r.category_requests,1);assert.equal(r.halted_reason,"http_403");assert.equal(n,1);
});
test("two allowed pages respect at least ten seconds before second request",async()=>{
 const waited=[],requests=[];
 const fetchImpl=async url=>{requests.push(url);return {status:200,url,headers:{get:()=>"text/html"},text:async()=>"<html><body></body></html>"};};
 const r=await runSaroutyCanary({fetchImpl,robotsText:"User-agent: *\nAllow: /\nCrawl-delay: 10",sleep:ms=>{waited.push(ms);}});
 assert.equal(r.category_requests,2);assert.deepEqual(waited,[10000]);assert.equal(r.five_fields_certified,0);
});

test("category links are not source listing IDs",()=>{
 const html='<article><a href="/acheter/casablanca/appartements-a-vendre/">1 200 000 DH 95 m²</a></article>';
 const r=probeSaroutyCards(html,"https://www.sarouty.ma/acheter/casablanca/appartements-a-vendre/");
 assert.equal(r.source_identity_candidates_observed,0);
});
