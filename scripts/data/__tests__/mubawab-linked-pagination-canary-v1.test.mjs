import test from 'node:test';
import assert from 'node:assert/strict';
import {SEEDS,discoverPaginationLinks,runPaginationCanary} from '../mubawab-linked-pagination-canary-v1.mjs';
const robots='User-agent: *\nAllow: /';
const html=(base)=>'<div><a href="'+base+'?page=2">Suivant</a><a href="'+base+':p:3">3</a><a href="'+base+'/page/4">4</a><a href="'+base+'?sort=price">Trier</a><a href="https://evil.example/x?page=2">external</a><a href="/fr/a/12345/test">Details</a></div>';
test('only source-authored exact-category pagination links accepted without fetching them',()=>{
 const base=SEEDS[0].url;
 const r=discoverPaginationLinks(html(base),base,robots);
 assert.deepEqual(r.candidates.map(x=>x.page),[2,3,4]);
 assert.ok(r.candidates.every(x=>x.observed_in_html_anchor===true&&x.visited===false));
});
test('robots permissions reject discovered candidate paths',()=>{
 const base=SEEDS[0].url;
 const r=discoverPaginationLinks(html(base),base,'User-agent: *\nDisallow: /fr/st/');
 assert.equal(r.candidates.length,0);assert.equal(r.forbidden,3);
});
test('stop 403/429 and robots fail-closed, never request a pagination URL',async()=>{
 let calls=[];const fetchImpl=async url=>{calls.push(url);return {status:403,url,headers:{get:()=>''}};};
 let a=await runPaginationCanary({seeds:SEEDS,robotsText:robots,fetchImpl,paceMs:0,sleep:()=>{}});
 assert.equal(a.report.halted_reason,'http_403');assert.equal(a.report.category_requests,1);
 assert.equal(a.report.pagination_requests,0);assert.equal(calls.length,1);
 a=await runPaginationCanary({seeds:SEEDS,robotsText:'User-agent: *\nDisallow: /fr/st/',fetchImpl});
 assert.equal(a.report.category_requests,0);
});
test('bounded four-page scan preserves source and zero-write invariant',async()=>{
 const calls=[];const fetchImpl=async url=>{calls.push(url);return {status:200,url,headers:{get:()=> 'text/html'},text:async()=>html(url)};};
 const {report,candidates}=await runPaginationCanary({fetchImpl,robotsText:robots,paceMs:0,sleep:()=>{}});
 assert.equal(report.category_requests,4);assert.equal(report.observed_categories,4);
 assert.equal(candidates.length,12);assert.equal(report.pagination_requests,0);
 assert.equal(report.database_writes,0);assert.equal(calls.length,4);
});

test('source-linked category types are discovered, never followed or treated as listings',async()=>{
 const origin=SEEDS[0].url;
 const categories=['https://www.mubawab.ma/fr/st/f%C3%A8s/maisons-a-vendre','https://www.mubawab.ma/fr/st/k%C3%A9nitra/terrains-a-louer'];
 let requests=0;
 const fetchImpl=async url=>{requests++;return {status:200,url,headers:{get:()=> 'text/html'},text:async()=>categories.map(c=>'<a href="'+c+'">Catégorie</a>').join('')};};
 const {report,typeCategories}=await runPaginationCanary({seeds:[SEEDS[0]],robotsText:robots,paceMs:0,fetchImpl});
 assert.equal(report.category_requests,1);assert.equal(report.candidate_type_category_urls,2);
 assert.equal(typeCategories.length,2);assert.equal(requests,1);
 assert.ok(typeCategories.every(c=>c.observed_in_public_anchor&&c.followed===false));
});
