import test from 'node:test';
import assert from 'node:assert/strict';
import {gate,ids,robotsPermit,blockedRequestBucket} from '../../acquisition/feenway-n02-hydration-probe.mjs';
const base='https://www.feenway.com',url=base+'/appartement-a-vendre/casablanca';
test('url extraction is bounded, deduplicated and cross-origin safe',()=>{
 assert.deepEqual(ids(['/listings/5','/listings/5/','/listings/23','https://evil.com/listings/1','/listings/7?x=1']),['5','23']);
});
test('route guard prohibits details, API, dynamic, third party, writes and unknown navigation',()=>{
 assert.equal(gate(url,'GET','document',url),null);
 assert.equal(gate(base+'/_next/static/bundle.js','GET','script',url),null);
 assert.equal(gate(base+'/api/ads','GET','fetch',url),'blocked_route');
 assert.equal(gate(base+'/listings/123','GET','document',url),'blocked_route');
 assert.equal(gate(url+'?page=2','GET','document',url),'wrong_document');
 assert.equal(gate(url,'POST','document',url),'non_get');
 assert.equal(gate('https://evil.com/x.js','GET','script',url),'wrong_origin');
 assert.equal(gate(base+'/some/dynamic','GET','xhr',url),'dynamic_blocked');
});
test('robots fail closed; only public allowed landings permitted',()=>{
 const r='User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /samsar/\nDisallow: /paiement/\n';
 assert.equal(robotsPermit(r,'/appartement-a-vendre/casablanca'),true);
 assert.equal(robotsPermit(r,'/api/test'),false);
 assert.equal(robotsPermit('User-agent: *\nDisallow: /','/appartement-a-vendre/casablanca'),false);
});

test('blocked request metadata is categorized without preserving query, host or identifier',()=>{
 assert.equal(blockedRequestBucket('https://www.feenway.com/api/listings?token=secret','blocked_route'),'blocked_api');
 assert.equal(blockedRequestBucket('https://www.feenway.com/listings/123','blocked_route'),'blocked_listings');
 assert.equal(blockedRequestBucket('https://www.feenway.com/_next/data/build/route.json?session=secret','dynamic_blocked'),'dynamic_next_data');
 assert.equal(blockedRequestBucket('https://www.feenway.com/appartement-a-vendre/casablanca?cursor=secret','dynamic_blocked'),'dynamic_market');
 assert.equal(blockedRequestBucket('https://www.feenway.com/other/section?secret=hidden','dynamic_blocked'),'dynamic_other');
 assert.equal(blockedRequestBucket('https://www.feenway.com/appartement-a-vendre/casablanca','asset_blocked'),null);
});
