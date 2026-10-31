import test from "node:test";
import assert from "node:assert/strict";
import {categoryFromUrl,extractFrontierCategories,seedPages,estimateCoverageGap,runNationalFrontier} from "../mubawab-national-frontier-v1.mjs";
const home="https://www.mubawab.ma/fr/cc/immobilier-a-vendre";
const casa="https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre";
const fes="https://www.mubawab.ma/fr/ct/f%C3%A8s/immobilier-a-vendre";
const card=id=>({identity:"a:"+id,canonical_url:"https://www.mubawab.ma/fr/a/"+id+"/x",city:"Casablanca",district:"Gauthier",price_mad:1900000,surface_m2:80,five_field_present:true});
const parsed=html=>({rows:[card(8900111)],five_field_present:1,raw_detail_anchors:1,rejected_mixed:0});
test("source-discovered city categories are isolated; unknown routes rejected",()=>{
 assert.equal(categoryFromUrl(casa)?.city,"Casablanca");
 assert.equal(categoryFromUrl(fes)?.city,"Fès");
 assert.equal(categoryFromUrl("https://www.mubawab.ma/fr/st/kenitra/appartements-a-vendre")?.city,"Kénitra");
 assert.equal(categoryFromUrl("https://evil.invalid/fr/ct/casablanca/immobilier-a-vendre"),null);
 assert.equal(categoryFromUrl("https://www.mubawab.ma/fr/a/8900111/x"),null);
 assert.equal(categoryFromUrl("https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre:p:2"),null);
 assert.equal(categoryFromUrl("https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre?n=1"),null);
 assert.equal(categoryFromUrl("https://www.mubawab.ma/fr/st/imaginarytown/appartements-a-vendre"),null);
});
test("actual hrefs discover CT and ST while ignoring details and external domains",()=>{
 const html='<a href="/fr/ct/casablanca/immobilier-a-vendre">Casa</a><a href="/fr/ct/f%C3%A8s/immobilier-a-vendre">Fes</a><a href="/fr/st/casablanca/appartements-a-vendre">Appart</a><a href="/fr/a/8900111/foo">Détail</a><a href="https://evil.invalid/fr/ct/casablanca/immobilier-a-vendre">evil</a>';
 const found=extractFrontierCategories(html,home);
 assert.equal(found.length,3);
 assert.equal(new Set(found.map(x=>x.city)).size,2);
});
test("national bootstrap root is discovery only and never invents city fields",async()=>{
 let calls=0;
 const fetchImpl=async url=>{
  calls++;
  return {status:200,url,headers:{get:()=> "text/html"},text:async()=>url===home?'<a href="/fr/ct/casablanca/immobilier-a-vendre">Casa</a>':"<body>cards</body>"};
 };
 const {report,rows}=await runNationalFrontier({pages:[{url:home,city:null,kind:"cc"}],maxRequests:2,fetchImpl,parser:parsed,robotsText:"User-agent: *\nAllow: /",paceMs:0});
 assert.equal(calls,2);assert.equal(report.discovered_category_urls,1);
 assert.equal(report.unique_listing_ids,1);
 assert.equal(report.pages[0].state,"discovery_only");
 assert.equal(rows[0].freshness_certified,false);
});
test("duplicate category references are not enqueued twice",async()=>{
 const html='<a href="/fr/ct/casablanca/immobilier-a-vendre">Casa</a><a href="/fr/ct/casablanca/immobilier-a-vendre">Casa</a>';
 let calls=0;
 const fetchImpl=async url=>{calls++;return {status:200,url,headers:{get:()=>"text/html"},text:async()=>html};};
 const {report}=await runNationalFrontier({pages:[{url:home,city:null,kind:"cc"}],maxRequests:5,fetchImpl,parser:parsed,robotsText:"User-agent: *\nAllow: /",paceMs:0});
 assert.equal(calls,2);assert.equal(report.unique_listing_ids,1);
 assert.equal(report.discovered_category_urls,1);
});
test("result count is a coverage gap, not an implicit 100 percent certification",()=>{
 const r=estimateCoverageGap("<body>(8 318 résultats)</body>",29);
 assert.equal(r.site_result_count,8318);
 assert.equal(r.underenumerated,true);
});
test("net-new source IDs versus prior baseline are measured separately from full cards",async()=>{
 const fetchImpl=async url=>({status:200,url,headers:{get:()=>"text/html"},text:async()=>"<body>(100 résultats)</body>"});
 const {report}=await runNationalFrontier({pages:[{url:casa,city:"Casablanca",kind:"ct"}],maxRequests:1,fetchImpl,parser:parsed,robotsText:"User-agent: *\nAllow: /",paceMs:0,baselineIds:new Set(["a:8900111"])});
 assert.equal(report.unique_listing_ids,1);
 assert.equal(report.net_new_ids_vs_prior_50,0);
 assert.equal(report.net_new_five_field_vs_prior_50,0);
 assert.equal(report.pages[0].underenumerated,true);
});
test("403 and 429 stop globally and no detail urls fetched",async()=>{
 let calls=0;
 const fetchImpl=async url=>{calls++;return {status:429,url,headers:{get:()=>"text/html"},text:async()=>""};};
 const {report}=await runNationalFrontier({pages:[{url:casa,city:"Casablanca"}, {url:fes,city:"Fès"}],fetchImpl,maxRequests:5,robotsText:"User-agent: *\nAllow: /",paceMs:0});
 assert.equal(calls,1);assert.equal(report.halted_reason,"http_429");
 assert.equal(report.database_writes,0);
});
test("robots denies the crawl and request count stays zero",async()=>{
 const fetchImpl=async()=>{throw Error("no network");};
 const {report}=await runNationalFrontier({pages:[{url:casa,city:"Casablanca"}],maxRequests:1,fetchImpl,robotsText:"User-agent: *\nDisallow: /",paceMs:0});
 assert.equal(report.requests,0);assert.equal(report.unique_listing_ids,0);
});
test("the seed queue is bounded and does not accidentally include individual ads",()=>{
 const seeds=seedPages();
 assert.equal(seeds.length,52);assert.equal(seeds.filter(x=>x.kind==="cc").length,2);
 assert.equal(seeds.some(x=>x.url.includes("/fr/a/")),false);
});

test("district category shards are source-authorized URL candidates, never fabricated",()=>{
 const cd="https://www.mubawab.ma/fr/cd/casablanca/hay-mohammadi/immobilier-a-vendre";
 const sd="https://www.mubawab.ma/fr/sd/casablanca/maarif/appartements-a-louer";
 const d=categoryFromUrl(cd);
 assert.equal(d?.kind,"cd");assert.equal(d?.city,"Casablanca");
 assert.equal(d?.district_slug,"hay-mohammadi");
 assert.equal(categoryFromUrl(sd)?.kind,"sd");
 assert.equal(categoryFromUrl("https://www.mubawab.ma/fr/cd/casablanca/unknown/immobilier-a-vendre:p:2"),null);
 assert.equal(categoryFromUrl("https://www.mubawab.ma/fr/cd/casablanca/unknown/immobilier-a-vendre?n=1"),null);
});
test("frontier expands real linked neighborhood categories while excluding unrelated city",()=>{
 const root="https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre";
 const html='<a href="/fr/cd/casablanca/hay-mohammadi/immobilier-a-vendre">Hay</a><a href="/fr/cd/casablanca/benjdia/immobilier-a-vendre">Benjdia</a><a href="/fr/a/8123456/foo">detail</a>';
 const r=extractFrontierCategories(html,root);
 assert.equal(r.length,2);
 assert.ok(r.every(x=>x.kind==="cd"&&x.city==="Casablanca"));
});
