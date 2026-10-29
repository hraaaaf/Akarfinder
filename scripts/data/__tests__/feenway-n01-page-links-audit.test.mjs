import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED, seeds, citySeeds, extractListingLinks } from '../../acquisition/feenway-n01-page-links-audit.mjs';

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
