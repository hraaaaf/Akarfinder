import test from 'node:test';
import assert from 'node:assert/strict';
import {extractKaynlySourceLinks,runKaynlySourceLinkCanary} from '../kaynly-source-link-canary-v1.mjs';
const base='https://kaynly.com/vente/casablanca';
const robots='User-agent: *\nAllow: /';
const anchor=(url,label='Voir l’annonce sur Mubawab →')=>'<article><h3>Appartement</h3><a href="'+url+'">'+label+'</a></article>';
test('only genuine external listing-action links; no source-domain or URL inference',()=>{
 const html=anchor('https://www.mubawab.ma/fr/a/12345/annonce')+
  anchor('https://www.mubawab.ma/fr/a/12345/annonce')+
  anchor('https://evil.example/list/123','Voir l’annonce sur Evil →')+
  anchor('/vente/casablanca','Voir l’annonce sur Kaynly →');
 const r=extractKaynlySourceLinks(html,base);
 assert.equal(r.links.length,1);assert.equal(r.rejected_untrusted_source_links,2);
 assert.equal(r.links[0].source_listing_id_verified,false);
 assert.equal(r.links[0].commercially_available_verified,false);
});
test('index result titles without source links are not treated as property records',()=>{
 const r=extractKaynlySourceLinks('<h3>14 000 annonces</h3><p>1 200 000 MAD</p>',base);
 assert.equal(r.links.length,0);
});
test('robots fail closed and 429 stops without accessing additional pages',async()=>{
 let calls=0;const fetchImpl=async url=>{calls++;return {status:429,url};};
 const denied=await runKaynlySourceLinkCanary({robotsText:'User-agent: *\nDisallow: /vente\nDisallow: /location',fetchImpl});
 assert.equal(denied.report.category_requests,0);assert.equal(calls,0);
 const halted=await runKaynlySourceLinkCanary({robotsText:robots,fetchImpl,sleep:()=>{}});
 assert.equal(halted.report.halted_reason,'http_429');assert.equal(calls,1);
});
test('bounded two pages, no source detail requests or database operations',async()=>{
 const fetchImpl=async url=>({status:200,url,headers:{get:()=> 'text/html'},text:async()=>anchor('https://yakeey.com/fr-ma/acheter-appartement-casablanca-ca187111','Voir l’annonce sur Yakeey →')});
 const {report,rows}=await runKaynlySourceLinkCanary({robotsText:robots,fetchImpl,sleep:()=>{},paceMs:0});
 assert.equal(report.category_requests,2);assert.equal(report.observed_index_pages,2);
 assert.equal(report.unique_source_urls_in_sample,1);assert.equal(rows.length,1);
 assert.equal(report.third_party_detail_requests,0);assert.equal(report.db_writes,0);
});
