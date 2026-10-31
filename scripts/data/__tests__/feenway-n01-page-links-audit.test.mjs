import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED, seeds, citySeeds, evenSample, extractListingLinks, safeRedirectTarget, get } from '../../acquisition/feenway-n01-page-links-audit.mjs';

test('sample seeds are public, bounded and deduplicated',()=>{
 const rows=[
  {sitemap:'cities.xml',url:'https://www.feenway.com/immobilier/casablanca'},
  {sitemap:'cities.xml',url:'https://www.feenway.com/immobilier/rabat'},
  {sitemap:'cities.xml',url:'https://www.feenway.com/ar/immobilier/rabat'},
  {sitemap:'markets.xml',url:'https://www.feenway.com/appartement-a-louer/casablanca'},
  {sitemap:'quartiers.xml',url:'https://www.feenway.com/appartement-a-louer/casablanca/maarif'}
 ];
 const got=seeds(rows);
 assert.ok(got.length>=FIXED.length);
 assert.equal(got.length,new Set(got).size);
 assert.ok(got.every(u=>u.startsWith('https://www.feenway.com/')&&!u.includes('/api/')));
 assert.ok(got.includes('https://www.feenway.com/immobilier/rabat'));
});
test('extracts public listing links only, normalizes trailing slash and rejects query redirects',()=>{
 const html='<a href="/listings/123">OK</a><a href="https://www.feenway.com/listings/123/">dup</a><a href="/api/private">no</a><a href="https://evil.com/listings/2">no</a><a href="/listings/999?redirect=evil">no</a><a href="/listings/456">OK</a>';
 assert.deepEqual(extractListingLinks(html,'https://www.feenway.com/immobilier/casablanca'),['https://www.feenway.com/listings/123','https://www.feenway.com/listings/456']);
});

test('full city seed mode excludes translated duplicates and remains bounded',()=>{
 const rows=[
  {sitemap:'cities.xml',url:'https://www.feenway.com/immobilier/casablanca'},
  {sitemap:'cities.xml',url:'https://www.feenway.com/ar/immobilier/casablanca'},
  {sitemap:'cities.xml',url:'https://www.feenway.com/en/property/casablanca'},
  {sitemap:'cities.xml',url:'https://www.feenway.com/immobilier/rabat'},
  {sitemap:'markets.xml',url:'https://www.feenway.com/appartement-a-vendre/rabat'}
 ];
 assert.deepEqual(citySeeds(rows),['https://www.feenway.com/immobilier/casablanca','https://www.feenway.com/immobilier/rabat']);
});

test('evenly distributed and bounded public page sampling',()=>{
 const urls=Array.from({length:90},(_,i)=>'https://www.feenway.com/immobilier/test-'+String(i).padStart(3,'0'));
 const chosen=evenSample(urls,8);
 assert.equal(chosen.length,8);
 assert.equal(new Set(chosen).size,8);
 assert.ok(chosen[0]!==urls[0]&&chosen.at(-1)!==urls.at(-1));
});
test('city mode collects only deduplicated FR public city pages',()=>{
 const rows=[
  {sitemap:'cities.xml',url:'https://www.feenway.com/immobilier/casablanca'},
  {sitemap:'cities.xml',url:'https://www.feenway.com/immobilier/casablanca'},
  {sitemap:'cities.xml',url:'https://www.feenway.com/immobilier/rabat'},
  {sitemap:'cities.xml',url:'https://www.feenway.com/en/property/rabat'},
  {sitemap:'cities.xml',url:'https://www.feenway.com/immobilier/rabat?page=2'},
  {sitemap:'cities.xml',url:'https://www.feenway.com/api/private'}
 ];
 assert.deepEqual(citySeeds(rows),[
  'https://www.feenway.com/immobilier/casablanca',
  'https://www.feenway.com/immobilier/rabat'
 ]);
});

import { buildQueue } from '../../acquisition/feenway-n01-surface-queue.mjs';
test('batch-1 first 50 public quartier pages are bounded and deduplicated',()=>{
 const rows=Array.from({length:65},(_,i)=>({sitemap:'quartiers.xml',url:'https://www.feenway.com/appartement-a-vendre/casablanca/zone-'+i}));
 const queue=buildQueue(rows,50).rows.filter(x=>x.batch===1);
 assert.equal(queue.length,50);
 assert.equal(new Set(queue.map(x=>x.url)).size,50);
 assert.ok(queue.every(x=>x.url.startsWith('https://www.feenway.com/')&&x.listing_detail_requests===0));
});

test('308 canonical alias stays on the same public category and city',()=>{
 assert.equal(safeRedirectTarget('https://www.feenway.com/terrain-a-vendre/marrakech/route-dourika','/terrain-a-vendre/marrakech/route-de-lourika'),'https://www.feenway.com/terrain-a-vendre/marrakech/route-de-lourika');
 assert.equal(safeRedirectTarget('https://www.feenway.com/appartement-a-vendre/tanger/ziatene','https://www.feenway.com/appartement-a-vendre/tanger/ziaten'),'https://www.feenway.com/appartement-a-vendre/tanger/ziaten');
 for(const target of ['https://evil.example/terrain-a-vendre/marrakech/route-de-fez','/api/private','/listings/123','/terrain-a-vendre/casablanca/foo','/terrain-a-vendre/marrakech/bar?page=2','/terrain-a-vendre/marrakech/route-de-fes']){
  assert.throws(()=>safeRedirectTarget('https://www.feenway.com/terrain-a-vendre/marrakech/route-de-fes',target));
 }
});
test('fetch accepts exactly one safe 308 and retains final public URL',async()=>{
 const old=globalThis.fetch;
 const urls=[];
 globalThis.fetch=async url=>{
  urls.push(url);
  if(url.endsWith('/route-de-fes'))return new Response('',{status:308,headers:{location:'/terrain-a-vendre/marrakech/route-de-fez'}});
  return new Response('<a href="/listings/101">ok</a>',{status:200,headers:{'content-type':'text/html'}});
 };
 try{
  const start='https://www.feenway.com/terrain-a-vendre/marrakech/route-de-fes';
  const x=await get(start);
  assert.equal(urls.length,2);
  assert.equal(x.finalUrl,'https://www.feenway.com/terrain-a-vendre/marrakech/route-de-fez');
  assert.equal(x.redirectTo,x.finalUrl);
  assert.deepEqual(extractListingLinks(x.html,x.finalUrl),['https://www.feenway.com/listings/101']);
 }finally{globalThis.fetch=old;}
});
test('transient network TypeError retries exactly once, never retries HTTP 429',async()=>{
 const previous=globalThis.fetch;
 const url='https://www.feenway.com/appartement-a-vendre/agadir/riad-salam';
 try{
  let attempts=0;
  globalThis.fetch=async()=>{
   attempts++;
   if(attempts===1)throw new TypeError('fetch failed');
   return new Response('<a href="/listings/101">ok</a>',{status:200});
  };
  const result=await get(url);
  assert.equal(result.finalUrl,url);
  assert.equal(attempts,2);
  attempts=0;
  globalThis.fetch=async()=>{attempts++;throw new TypeError('fetch failed');};
  await assert.rejects(get(url),/fetch failed/);
  assert.equal(attempts,2);
  attempts=0;
  globalThis.fetch=async()=>{attempts++;return new Response('rate-limited',{status:429});};
  await assert.rejects(get(url),/http_429/);
  assert.equal(attempts,1);
 }finally{globalThis.fetch=previous;}
});
test('redirect to another host, robots redirect and second redirect fail closed',async()=>{
 const previous=globalThis.fetch;const start='https://www.feenway.com/terrain-a-vendre/marrakech/route-de-fes';
 try{
  globalThis.fetch=async()=>new Response('',{status:308,headers:{location:'https://outside.example'}});await assert.rejects(get(start),/redirect_unsafe_target/);
  globalThis.fetch=async()=>new Response('',{status:308,headers:{location:'/terrain-a-vendre/marrakech/route-de-fez'}});await assert.rejects(get(start),/http_308/);
  await assert.rejects(get('https://www.feenway.com/robots.txt','text/plain'),/redirect_not_allowed_for_robots/);
 }finally{globalThis.fetch=previous;}
});
