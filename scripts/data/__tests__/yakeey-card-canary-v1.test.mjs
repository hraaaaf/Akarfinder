import test from 'node:test';
import assert from 'node:assert/strict';
import {listingIdentity,extractYakeeyCards,linkedPageTwo,runYakeeyPilot} from '../yakeey-card-canary-v1.mjs';
const sale='https://yakeey.com/fr-ma/achat/biens/maroc';
const rental='https://yakeey.com/fr-ma/location/biens/maroc';
const robots='User-agent: *\nAllow: /';
const card=(id='CA187111',status='')=>'<article><a href="/fr-ma/acheter-appartement-casablanca-californie-'+id.toLowerCase()+'"><h2>Appartement</h2><span>2 229 595 DH</span><span>Californie, Casablanca</span><span>151 m²</span><em>'+status+'</em></a></article>';
test('canonical source identity excludes external and project routes',()=>{
 assert.equal(listingIdentity('/fr-ma/acheter-appartement-casablanca-californie-ca187111').identity,'yakeey:CA187111');
 assert.equal(listingIdentity('https://other.example/fr-ma/acheter-appartement-ca187111'),null);
 assert.equal(listingIdentity('/fr-ma/achat/biens/maroc'),null);
});
test('independent card five fields and explicit sold marker',()=>{
 const r=extractYakeeyCards(card()+card('CA187112','Vendu'),sale);
 assert.equal(r.rows.length,2);assert.equal(r.rows.filter(x=>x.five_field_observed).length,1);
 assert.equal(r.rows.find(x=>x.identity==='yakeey:CA187111').price_mad,2229595);
 assert.equal(r.rows.find(x=>x.identity==='yakeey:CA187111').district,'Californie');
 assert.equal(r.rows.find(x=>x.identity==='yakeey:CA187112').card_closed_marker,true);
});
test('several distinct cards never borrow missing fields from a neighboring listing',()=>{
 const html='<section><article><a href="/fr-ma/acheter-appartement-casablanca-ca187111">Californie, Casablanca 151 m²</a></article>'+card('CA187112')+'</section>';
 const r=extractYakeeyCards(html,sale);
 assert.equal(r.rows.length,1);assert.equal(r.rows[0].identity,'yakeey:CA187112');
 assert.equal(r.rows[0].five_field_observed,true);
});
test('page two only when explicitly linked and robots permits',()=>{
 const html='<a href="'+sale+'?page=2">2</a><a href="'+sale+'?page=99">99</a>';
 assert.equal(linkedPageTwo(html,sale,robots),sale+'?page=2');
 assert.equal(linkedPageTwo(html,sale,'User-agent: *\nDisallow: /fr-ma/'),null);
});
test('robots deny and 429 immediately stop without bypass or database operations',async()=>{
 let n=0;const blocked=async url=>{n++;return {status:429,url};};
 const a=await runYakeeyPilot({fetchImpl:blocked,robotsText:'User-agent: *\nDisallow: /fr-ma/',sleep:()=>{}});
 assert.equal(a.report.category_requests,0);assert.equal(n,0);
 const b=await runYakeeyPilot({fetchImpl:blocked,robotsText:robots,sleep:()=>{}});
 assert.equal(b.report.halted_reason,'http_429');assert.equal(n,1);assert.equal(b.report.database_writes,0);
});
test('two source roots plus observed page-two never exceed four requests',async()=>{
 const calls=[];const fetchImpl=async url=>{calls.push(url);return {status:200,url,headers:{get:()=> 'text/html'},text:async()=>card()+'<a href="'+url.split('?')[0]+'?page=2">2</a>'};};
 const r=await runYakeeyPilot({fetchImpl,robotsText:robots,sleep:()=>{},paceMs:0});
 assert.equal(r.report.category_requests,4);assert.equal(calls.length,4);
 assert.equal(r.report.unique_source_ids,1);assert.equal(r.report.database_writes,0);
});
