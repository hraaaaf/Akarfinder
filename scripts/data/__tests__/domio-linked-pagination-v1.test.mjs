import test from "node:test";
import assert from "node:assert/strict";
import {domioPageNumber,linkedNextPage,mergeDomioRows,crawlDomioLinkedPages} from "../domio-linked-pagination-v1.mjs";
const base="https://domio.ma/fr/appartement/vendre/casablanca";
const other="https://domio.ma/fr/appartement/louer/rabat";
const row=(identity,price=1500000)=>({identity:"domio:"+identity,url:base+"/"+identity+"/annonce",city:"Casablanca",district:"Maarif",price_mad:price,surface_m2:80,five_field_present:true});
test("only exact category and a single canonical page number are allowed",()=>{
 assert.equal(domioPageNumber(base,base),1);
 assert.equal(domioPageNumber(base+"?page=3",base),3);
 assert.equal(domioPageNumber(base+"?page=2&sort=date",base),null);
 assert.equal(domioPageNumber(other+"?page=2",base),null);
 assert.equal(domioPageNumber("https://evil.invalid/fr/appartement/vendre/casablanca?page=2",base),null);
 assert.equal(domioPageNumber(base+"?page=999",base),null);
});
test("follows next page only when explicitly published in source HTML",()=>{
 const html='<a href="?page=18">18</a><a href="?page=3">3</a><a href="?page=2">2</a>';
 assert.equal(linkedNextPage(html,base,base),base+"?page=2");
 assert.equal(linkedNextPage('<a href="?page=3">3</a>',base,base),null);
 assert.equal(linkedNextPage('<a href="?page=3">3</a>',base+"?page=2",base),base+"?page=3");
});
test("same source ID across pages merges; contradictory price quarantines",()=>{
 const merged=mergeDomioRows([{rows:[row("12350")]},{rows:[row("12350",1800000),row("12351")]}]);
 assert.equal(merged.rows.length,2);
 assert.equal(merged.duplicated,1);assert.equal(merged.conflicted,1);
 assert.equal(merged.complete,1);
 assert.equal(merged.rows.find(x=>x.identity==="domio:12350").freshness_certified,false);
});
test("crawl is breadth-first by source categories and never invents page numbers",async()=>{
 const calls=[];
 const fetchImpl=async url=>{
  calls.push(url);
  const page=domioPageNumber(url,base) || domioPageNumber(url,other);
  return {status:200,url,headers:{get:()=>"text/html"},text:async()=>page===1?'<a href="?page=2">Next</a>':"<p>end</p>"};
 };
 const parser=(html,url)=>({rows:[row(url.includes("page=2")?"12351":"12350")],five_field_present:1});
 const result=await crawlDomioLinkedPages({seeds:[base,other],maxRequests:4,paceMs:0,fetchImpl,parser,robotsText:"User-agent: *\nAllow: /",
   baselineIds:new Set(["domio:12350"])});
 assert.equal(result.report.requests,4);
 assert.deepEqual(calls,[base,other,base+"?page=2",other+"?page=2"]);
 assert.equal(result.report.distinct_listing_ids,2);
 assert.equal(result.report.net_new_ids_vs_page1_page2,1);
 assert.equal(result.report.queue_remaining,0);
});
test("stale or identical page branch stops instead of infinite loop",async()=>{
 const requests=[];
 const fetchImpl=async url=>{requests.push(url);return {status:200,url,headers:{get:()=>"text/html"},text:async()=>'<a href="?page=2">2</a><a href="?page=3">3</a>'};};
 const parser=()=>({rows:[row("12350")],five_field_present:1});
 const {report}=await crawlDomioLinkedPages({seeds:[base],maxRequests:20,paceMs:0,fetchImpl,parser,robotsText:"User-agent: *\nAllow: /"});
 assert.equal(report.requests,2);assert.equal(report.identical_page_branches_stopped,1);
});
test("robots denies pagination, including query-specific rules",async()=>{
 let requested=0;
 const fetchImpl=async()=>{requested++;throw Error("no requests expected");};
 const {report}=await crawlDomioLinkedPages({seeds:[base],maxRequests:3,paceMs:0,fetchImpl,robotsText:"User-agent: *\nDisallow: /fr/"});
 assert.equal(report.requests,0);assert.equal(requested,0);
});
test("403/429 stops all categories immediately and keeps zero database writes",async()=>{
 let requested=0;
 const fetchImpl=async url=>{requested++;return {status:429,url,headers:{get:()=>"text/html"},text:async()=>""};};
 const {report}=await crawlDomioLinkedPages({seeds:[base,other],maxRequests:7,paceMs:0,fetchImpl,robotsText:"User-agent: *\nAllow: /"});
 assert.equal(report.requests,1);assert.equal(report.halted_reason,"http_429");assert.equal(requested,1);
 assert.equal(report.database_writes,0);
});
test("maximum request budget is a hard cap independent of source pagination depth",async()=>{
 const fetchImpl=async url=>({status:200,url,headers:{get:()=>"text/html"},
  text:async()=>'<a href="?page=2">Next</a>'});
 const parser=()=>({rows:[row("12350")],five_field_present:1});
 const {report}=await crawlDomioLinkedPages({seeds:[base,other],maxRequests:1,paceMs:0,fetchImpl,parser,robotsText:"User-agent: *\nAllow: /"});
 assert.equal(report.requests,1);assert.equal(report.queue_remaining>0,true);
});
