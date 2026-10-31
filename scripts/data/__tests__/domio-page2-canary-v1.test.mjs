import test from "node:test";
import assert from "node:assert/strict";
import {pageTwoUrl,samePageTwo,scanPageTwo,BASES} from "../domio-page2-canary-v1.mjs";
const original=BASES[0],next=pageTwoUrl(original);
const row=(id,price)=>'<a href="/fr/appartement/vendre/casablanca/'+id+'/flat">Acheter '+price+' DH Casablanca, Racine 80.0 m²</a>';
test("seven deterministic category pages advance to page two only",()=>{
 assert.equal(BASES.length,7);assert.equal(new Set(BASES).size,7);
 assert.equal(next,original+"?page=2");
 assert.equal(pageTwoUrl("https://other.example/foo"),null);
});
test("destination must preserve exact category and page identity",()=>{
 assert.equal(samePageTwo(next,next),true);
 assert.equal(samePageTwo(next,original),false);
 assert.equal(samePageTwo(next,original+"?page=1"),false);
 assert.equal(samePageTwo(next,"https://evil.example/fr/appartement/vendre/casablanca?page=2"),false);
});
test("two distinct IDs are counted; page one repeats are not net-new",async()=>{
 const fetchImpl=async url=>({status:200,url,headers:{get:()=>"text/html"},text:async()=>row(12345,"950 000")+row(12346,"1 200 000")});
 const {report,rows}=await scanPageTwo({bases:[original],existingIds:new Set(["domio:12345"]),robotsText:"User-agent: *\nAllow: /",fetchImpl,paceMs:0});
 assert.equal(report.observed_pages,1);assert.equal(report.request_count,1);
 assert.equal(report.unique_ids_page2,2);assert.equal(report.incremental_ids_vs_page1,1);
 assert.equal(report.incremental_five_field_vs_page1,1);
 assert.ok(rows.every(x=>x.freshness_certified===false));
});
test("robots forbids pagination without any category fetch",async()=>{
 let n=0;const fetchImpl=async()=>{n++;throw Error("must not call");};
 const {report}=await scanPageTwo({bases:[original],robotsText:"User-agent: *\nDisallow: /*?page=",fetchImpl,paceMs:0});
 assert.equal(report.request_count,0);assert.equal(n,0);assert.equal(report.observed_pages,0);
});
test("429 blocks further pages",async()=>{
 let calls=0;
 const fetchImpl=async url=>{calls++;return {status:429,url,headers:{get:()=>""},text:async()=>""};};
 const {report}=await scanPageTwo({bases:BASES.slice(0,2),robotsText:"User-agent: *\nAllow: /",fetchImpl,paceMs:0});
 assert.equal(report.halted_reason,"http_429");assert.equal(calls,1);
});
test("page-one redirect is not treated as successful page-two retrieval",async()=>{
 const fetchImpl=async()=>({status:200,url:original,headers:{get:()=>"text/html"},text:async()=>row(12345,"950 000")});
 const {report}=await scanPageTwo({bases:[original],robotsText:"User-agent: *\nAllow: /",fetchImpl,paceMs:0});
 assert.equal(report.observed_pages,0);assert.equal(report.unique_ids_page2,0);
});
