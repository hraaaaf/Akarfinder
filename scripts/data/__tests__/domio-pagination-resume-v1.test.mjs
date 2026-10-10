import test from "node:test";
import assert from "node:assert/strict";
import {eligibleResumeSeeds,resumeDomioPagination} from "../domio-pagination-resume-v1.mjs";
const casa="https://domio.ma/fr/appartement/vendre/casablanca";
const rabat="https://domio.ma/fr/appartement/louer/rabat";
const ref={pages:[
 {category:casa,page:12,state:"observed",next_link_present:true},
 {category:rabat,page:12,state:"observed",next_link_present:true},
 {category:"https://domio.ma/fr/appartement/vendre/marrakech",page:10,state:"observed",next_link_present:false}
]};
const row=(id)=>({identity:"domio:"+id,url:casa+"/"+id+"/sample",city:"Casablanca",district:"Maarif",price_mad:980000,surface_m2:70,five_field_present:true});
test("resume seeds only categories with proof of page12 next link",()=>{
 const seeds=eligibleResumeSeeds(ref);
 assert.equal(seeds.length,2);
 assert.equal(seeds[0].page,12);
 assert.equal(seeds.every(s=>s.url.endsWith("?page=12")),true);
});
test("page 12 revalidated and page13 consumed only when linked",async()=>{
 const calls=[];
 const fetchImpl=async url=>{
  calls.push(url);
  const page=Number(new URL(url).searchParams.get("page"));
  return {status:200,url,headers:{get:()=>"text/html"},
   text:async()=>page===12?'<a href="?page=13">Next</a>':'<p>end</p>'};
 };
 const parser=(html,url)=>({rows:[row(url.includes("page=12")?"12350":"12351")],five_field_present:1});
 const {report,rows}=await resumeDomioPagination({referenceReport:{pages:[ref.pages[0]]},
  referenceRows:[row("12350")],fetchImpl,parser,robotsText:"User-agent: *\nAllow: /",paceMs:0,maxRequests:8});
 assert.deepEqual(calls,[casa+"?page=12",casa+"?page=13"]);
 assert.equal(report.unique_new_source_ids_vs_prior_70,1);
 assert.equal(report.new_five_field_cards,1);
 assert.equal(rows[0].identity,"domio:12351");
 assert.equal(rows[0].freshness_certified,false);
});
test("no source HTML next link means no page13 guess",async()=>{
 const calls=[];
 const fetchImpl=async url=>{calls.push(url);return {status:200,url,headers:{get:()=>"text/html"},text:async()=>"<p>end</p>";};};
 const parser=()=>({rows:[row("12350")]});
 const {report}=await resumeDomioPagination({referenceReport:{pages:[ref.pages[0]]},referenceRows:[row("12350")],
  fetchImpl,parser,robotsText:"User-agent: *\nAllow: /",paceMs:0});
 assert.equal(calls.length,1);assert.equal(report.unique_new_source_ids_vs_prior_70,0);
});
test("stale repeated next-page content stops branch",async()=>{
 let requests=0;
 const fetchImpl=async url=>{requests++;return {status:200,url,headers:{get:()=>"text/html"},text:async()=>'<a href="?page=13">Next</a><a href="?page=14">14</a>'};};
 const parser=()=>({rows:[row("12350")]});
 const {report}=await resumeDomioPagination({referenceReport:{pages:[ref.pages[0]]},referenceRows:[row("12350")],
  fetchImpl,parser,robotsText:"User-agent: *\nAllow: /",paceMs:0});
 assert.equal(requests,2);assert.equal(report.repeated_page_branches_stopped,1);
});
test("robots deny and 429 stop without source bypass",async()=>{
 let n=0;
 const fetchImpl=async url=>{n++;return {status:429,url};};
 const denied=await resumeDomioPagination({referenceReport:ref,referenceRows:[],fetchImpl,
  robotsText:"User-agent: *\nDisallow: /fr/",paceMs:0});
 assert.equal(denied.report.request_count,0);
 const blocked=await resumeDomioPagination({referenceReport:ref,referenceRows:[],fetchImpl,
  robotsText:"User-agent: *\nAllow: /",paceMs:0});
 assert.equal(blocked.report.request_count,1);assert.equal(blocked.report.halted_reason,"http_429");assert.equal(n,1);
});
test("hard cap limits requests even when more resume seeds exist",async()=>{
 const fetchImpl=async url=>({status:200,url,headers:{get:()=>"text/html"},text:async()=>'<a href="?page=13">13</a>'});
 const parser=()=>({rows:[row("12350")]});
 const {report}=await resumeDomioPagination({referenceReport:ref,referenceRows:[],fetchImpl,parser,
  robotsText:"User-agent: *\nAllow: /",maxRequests:1,paceMs:0});
 assert.equal(report.request_count,1);assert.equal(report.queue_remaining>0,true);
});
