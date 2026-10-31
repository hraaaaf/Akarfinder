import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildQueue } from '../../acquisition/feenway-n01-surface-queue.mjs';
test('deduplicates, prefers quartiers, excludes translated and unrelated pages',()=>{
 const rows=[
  {sitemap:'markets.xml',url:'https://www.feenway.com/appartement-a-vendre/casablanca'},
  {sitemap:'quartiers.xml',url:'https://www.feenway.com/appartement-a-vendre/casablanca/racine'},
  {sitemap:'quartiers.xml',url:'https://www.feenway.com/appartement-a-vendre/casablanca/racine'},
  {sitemap:'markets.xml',url:'https://www.feenway.com/ar/appartement-a-vendre/casablanca'},
  {sitemap:'recent.xml',url:'https://www.feenway.com/listings/123'}
 ];
 const r=buildQueue(rows,1);
 assert.equal(r.rows.length,2);assert.equal(r.summary.quartiers,1);assert.equal(r.summary.markets,1);
 assert.equal(r.rows[0].batch,1);assert.equal(r.rows[1].batch,2);
 assert.match(r.rows[0].url,/racine/);
 assert.equal(r.summary.network_requests,0);assert.equal(r.summary.db_writes,0);
 assert.equal(r.summary.sha256,createHash('sha256').update(r.jsonl).digest('hex'));
});
test('invalid batch size fails closed',()=>{assert.throws(()=>buildQueue([],0));assert.throws(()=>buildQueue([],101));});
