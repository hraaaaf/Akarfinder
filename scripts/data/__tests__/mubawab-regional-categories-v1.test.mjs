import test from "node:test";
import assert from "node:assert/strict";
import {REGIONAL_CATEGORIES,runRegionalMubawabPilot} from "../mubawab-regional-categories-v1.mjs";
test("8 exact publicly observed category routes in four formerly uncovered cities",()=>{
 assert.equal(REGIONAL_CATEGORIES.length,8);
 assert.deepEqual([...new Set(REGIONAL_CATEGORIES.map(r=>r.city))],["Fès","Kénitra","Tétouan","Nador"]);
 assert.equal(new Set(REGIONAL_CATEGORIES.map(r=>r.url)).size,8);
 assert.ok(REGIONAL_CATEGORIES.every(r=>new URL(r.url).hostname==="www.mubawab.ma"));
});
test("city must come from an explicit listing location, not just page input",async()=>{
 const seed=REGIONAL_CATEGORIES[0];
 const html='<li class="listingBox"><a href="/fr/a/8451001/appart"><h2>Appartement</h2></a><span>900 000 DH</span><span>85 m²</span><div>Fès</div></li>';
 const fetchImpl=async url=>({status:200,url,headers:{get:()=>"text/html"},text:async()=>html});
 const {report,rows}=await runRegionalMubawabPilot({pages:[seed],baselineIds:new Set(),fetchImpl,robotsText:"User-agent: *\nAllow: /",sleep:()=>{}});
 assert.equal(report.unique_source_id_count,1);assert.equal(rows[0].city,null);
 assert.equal(rows[0].five_field_observed,false);
});
test("same card explicit district-city pairs count as observed, not fresh",async()=>{
 const seed=REGIONAL_CATEGORIES[0];
 const html='<li class="listingBox"><a href="/fr/a/8451001/appart"><h2>Appartement</h2></a><span>900 000 DH</span><span>85 m²</span><div>Nouvelle Ville, Fès</div></li>';
 const fetchImpl=async url=>({status:200,url,headers:{get:()=>"text/html"},text:async()=>html});
 const {report,rows}=await runRegionalMubawabPilot({pages:[seed],baselineIds:new Set(),fetchImpl,robotsText:"User-agent: *\nAllow: /",sleep:()=>{}});
 assert.equal(report.unique_source_id_count,1);assert.equal(report.unique_five_field_observed,1);
 assert.equal(report.net_new_source_ids_vs_freeze,1);
 assert.equal(rows[0].freshness_certified,false);
});
test("forbidden robots result means no fetch",async()=>{
 let called=0;
 const {report}=await runRegionalMubawabPilot({pages:[REGIONAL_CATEGORIES[0]],baselineIds:new Set(),robotsText:"User-agent: *\nDisallow: /fr/st/",fetchImpl:()=>{called++;throw Error("blocked");}});
 assert.equal(report.request_count,0);assert.equal(called,0);
});
