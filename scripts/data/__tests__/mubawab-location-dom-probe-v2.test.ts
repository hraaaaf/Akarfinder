import test from "node:test";
import assert from "node:assert/strict";
import {probeMubawabLocationDom} from "../mubawab-location-dom-probe-v2.js";

test("captures main column district location and breadcrumbs without related listings",()=>{
 const html='<body><div class="col-8"><div class="blockProp"><h1 class="searchTitle">Villa</h1><span>Maârif</span></div><div class="adLocation"><span>Maârif, Casablanca</span></div></div><div class="contentBox"><span class="adLocation">Racine, Casablanca</span></div><div class="breadcrumb"><a>Maroc</a><a>Casablanca</a><a>Maârif</a></div></body>';
 const r=probeMubawabLocationDom(html);
 assert.equal(r.primary_block_count,1);
 assert.equal(r.primary_column_count,1);
 assert.equal(r.observations.some(x=>x.scope==="primary_column"&&x.text==="Maârif, Casablanca"),true);
 assert.equal(r.observations.some(x=>x.text==="Racine, Casablanca"),false);
 assert.equal(r.observations.some(x=>x.scope==="breadcrumb"&&x.text==="Maârif"),true);
});
test("rejects phone email URL and verbose description text",()=>{
 const html='<div class="col-8"><div class="blockProp"><h1 class="searchTitle">Villa</h1><p>Contact 0612345678</p><span>name@example.com</span><span>Casablanca</span><p>https://example.com</p></div><div class="location">Contact 0612345678</div></div>';
 const r=probeMubawabLocationDom(html);
 assert.equal(r.observations.some(x=>x.text.includes("@")||x.text.includes("0612345678")||x.text.includes("https:")),false);
});
