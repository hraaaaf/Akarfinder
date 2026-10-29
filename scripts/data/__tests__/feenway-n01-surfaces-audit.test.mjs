import test from 'node:test';
import assert from 'node:assert/strict';
import { locs,safeUrl,classify,ALL,OTHER } from '../../acquisition/feenway-n01-surfaces-audit.mjs';

test('15 expected partitions and nine non-listing surfaces',()=>{
 assert.equal(ALL.length,15);assert.equal(OTHER.length,9);assert.equal(new Set(ALL).size,15);
});
test('XML loc and origin bounds, rejects API and redirected domains',()=>{
 const xml='<urlset><url><loc>https://www.feenway.com/immobilier/casablanca</loc></url><url><loc>https://www.feenway.com/immobilier/rabat</loc></url></urlset>';
 assert.equal(locs(xml).length,2);
 assert.equal(safeUrl('https://www.feenway.com/immobilier/rabat'),'https://www.feenway.com/immobilier/rabat');
 for(const bad of ['https://other.example/immobilier/rabat','http://www.feenway.com/immobilier/rabat','https://www.feenway.com/immobilier/rabat?q=1'])assert.equal(safeUrl(bad),null);
});
test('recent overlap correctly flags only unsitemapped listing IDs',()=>{
 const xml='<urlset><url><loc>https://www.feenway.com/listings/101</loc></url><url><loc>https://www.feenway.com/listings/102</loc></url><url><loc>https://www.feenway.com/listings/101</loc></url></urlset>';
 const r=classify(xml,'recent',new Set(['https://www.feenway.com/listings/101']));
 assert.equal(r.count,3);assert.equal(r.unique,2);assert.equal(r.duplicated,1);
 assert.equal(r.listing_links,2);assert.equal(r.listing_in_main_six,1);assert.equal(r.listing_outside_main_six,1);
});
test('fail closed for foreign host, malformed or empty nonempty partitions',()=>{
 assert.throws(()=>classify('<urlset><url><loc>https://evil.example/listings/77</loc></url></urlset>','recent',new Set()),/invalid_url/);
 assert.throws(()=>classify('<urlset></urlset>','recent',new Set()),/empty_urlset/);
 assert.equal(classify('<urlset xmlns="x" />','feenway',new Set()).unique,0);
});
