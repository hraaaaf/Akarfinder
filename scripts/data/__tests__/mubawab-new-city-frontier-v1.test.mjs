import test from "node:test";
import assert from "node:assert/strict";
import {SEEDS,sourcePageCity,linkedCityCategories,crawlLinkedCityFrontier} from "../mubawab-new-city-frontier-v1.mjs";
const meknes=SEEDS[0],oujda=SEEDS[1];
const card='<li class="listingBox"><a href="/fr/a/8391101/un-bien">Un appartement</a><div class="price">850 000 DH</div><span>95 m²</span><div class="loc">Plaisance, Meknes</div></li>';
test("seeds are existing public pages beyond five incumbent cities",()=>{
 assert.equal(SEEDS.length,2);
 assert.ok(meknes.includes("/meknes/")&&oujda.includes("/oujda/"));
});
test("city must be explicitly printed in H1",()=>{
 assert.equal(sourcePageCity("<h1>Appartement à vendre à Meknes</h1>"),"Meknes");
 assert.equal(sourcePageCity("<h1>Maison à vendre à Marrakech</h1>"),null);
});
test("discovery requires links on official category route, no query or offsite",()=>{
 const html='<a href="/fr/st/oujda/appartements-a-vendre">Oujda</a><a href="https://evil.example/fr/st/fes/appartements-a-vendre">Offsite</a><a href="/fr/st/fes/appartements-a-vendre?sort=date">Query</a>';
 assert.deepEqual(linkedCityCategories(html,meknes),[oujda]);
});
test("robots gate refuses all discovery requests",async()=>{
 let n=0;
 const r=await crawlLinkedCityFrontier({robotsText:"User-agent: *\nDisallow: /fr/st/",fetchImpl:()=>{n++;throw Error("must not fetch");}});
 assert.equal(r.report.category_requests,0);assert.equal(n,0);
});
test("bounded crawl deduplicates IDs, computes net-new vs ledger, never certifies freshness",async()=>{
 const calls=[];
 const fetchImpl=async url=>{
  calls.push(url);
  const city=url.includes("/oujda/")?"Oujda":"Meknes";
  const html='<h1>Appartement à vendre à '+city+'</h1>'+card.replace("Plaisance, Meknes","Plaisance, "+city)+'<a href="/fr/st/oujda/appartements-a-vendre">Linked</a>';
  return {status:200,url,headers:{get:()=>"text/html"},text:async()=>html};
 };
 const r=await crawlLinkedCityFrontier({seeds:[meknes,oujda],fetchImpl,robotsText:"User-agent: *\nAllow: /",paceMs:0,maxPages:2,baselineIds:new Set(["a:9999999"])});
 assert.equal(r.report.category_requests,2);
 assert.equal(r.report.category_pages_observed,2);
 assert.equal(r.report.net_new_source_ids_vs_ledger,1);
 assert.equal(r.rows.length,1);
 assert.equal(r.rows[0].freshness_certified,false);
 assert.ok(calls.every(x=>!x.includes("/fr/a/")));
});
test("403 stops subsequent work immediately",async()=>{
 let n=0;
 const r=await crawlLinkedCityFrontier({robotsText:"User-agent: *\nAllow: /",fetchImpl:url=>{n++;return {status:403,url};},paceMs:0});
 assert.equal(n,1);assert.equal(r.report.halted_reason,"http_403");
});
