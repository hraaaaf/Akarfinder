import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeJsonl,reconcile,sha256,validListing} from '../../acquisition/feenway-n01-reconcile-evidence.mjs';
const url=n=>'https://www.feenway.com/listings/'+n;
const source='https://www.feenway.com/immobilier/rabat';
const row=n=>({url:url(n),discovered_on:[source]});
const batch=(number,rows)=>{
 const bytes=Buffer.from(rows.map(JSON.stringify).join('\n')+'\n');
 return {report:{complete:true,errors:[],planned_pages:50,pages_ok:50,listing_detail_requests:0,db_writes:0,listing_manifest_size:2,not_in_six_count:rows.length,batch_number:number,outside_manifest_sha256:sha256(bytes)},rows,rawBytes:bytes};
};
test('snapshot drift, cross-batch deduplication and provenance',()=>{
 const inp={sitemapRows:[{url:url(1)},{url:url(2)}],priorRows:[{url:url(2),landing_pages:[source]},{url:url(3),landing_pages:[source]}],batches:[batch(2,[row(3),row(4)]),batch(3,[row(4),row(5)])]};
 const {evidence,manifest}=reconcile(inp);
 assert.deepEqual([evidence.sitemap_urls,evidence.prior_now_in_sitemap,evidence.observed_in_batches_unique,evidence.observed_in_batches_prior_overlap,evidence.new_off_sitemap_urls,evidence.off_sitemap_unique,evidence.discovered_urls_unique],[2,1,3,1,2,3,5]);
 assert.deepEqual(decodeJsonl(manifest).map(x=>x.url),[url(3),url(4),url(5)]);
 assert.equal(evidence.merged_manifest_sha256,sha256(manifest));
});
test('fails closed for corrupt SHA, invalid listings and provenance',()=>{
 const base={sitemapRows:[{url:url(1)},{url:url(2)}],priorRows:[],batches:[batch(2,[row(3)])]};
 assert.equal(validListing('https://www.feenway.com/listings/1'),true);
 assert.equal(validListing('https://www.feenway.com/listings/1?secret=1'),false);
 assert.throws(()=>reconcile({...base,batches:[{...base.batches[0],rawBytes:Buffer.from('tampered')}] }),/sha256/);
 assert.throws(()=>reconcile({...base,batches:[batch(2,[row(1)])]}),/in_sitemap/);
 assert.throws(()=>reconcile({...base,priorRows:[{url:url(9)}]}),/provenance/);
});
