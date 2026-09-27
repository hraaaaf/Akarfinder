import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";

const gz=(path:string,rows:any[])=>writeFileSync(path,gzipSync(Buffer.from(rows.map(r=>JSON.stringify(r)).join("\n")+"\n")));

test("freeze cluster carry-forward never invents relations",()=>{
 const root=mkdtempSync(join(tmpdir(),"akarfinder-clusters-"));
 const v4=join(root,"v4.jsonl.gz"),src=join(root,"sources.jsonl.gz"),mem=join(root,"members.jsonl.gz"),out=join(root,"out.jsonl.gz");
 gz(v4,[{canonical_url:"https://a.test/p/1"},{canonical_url:"https://b.test/x/2"}]);
 gz(src,[
   {id:10,listing_url:"http://www.a.test/p/1/"},
   {id:11,listing_url:"https://b.test/x/2"},
   {id:12,listing_url:"https://c.test/z/3"}
 ]);
 gz(mem,[
   {property_cluster_id:"c1",source_offer_id:10,origin_type:"existing"},
   {property_cluster_id:"c1",source_offer_id:11,origin_type:"existing"},
   {property_cluster_id:"c2",source_offer_id:12,origin_type:"existing"}
 ]);
 const run=spawnSync(process.execPath,["--import","tsx","scripts/recovery/carry-forward-freeze-clusters-v4.ts","--v4",v4,"--listing-sources",src,"--cluster-members",mem,"--output",out],{cwd:process.cwd(),encoding:"utf8"});
 assert.equal(run.status,0,run.stderr||run.stdout);
 const rows=gunzipSync(readFileSync(out)).toString("utf8").trim().split("\n").map(JSON.parse);
 assert.equal(rows.length,1);
 assert.equal(rows[0].cluster_id,"c1");
 assert.equal(rows[0].v4_member_count,2);
 assert.equal(rows[0].inferred_new_relation,false);
 const manifest=JSON.parse(readFileSync(out.replace(/\.jsonl\.gz$/,"-manifest.json"),"utf8"));
 assert.equal(manifest.v4_urls_covered,2);
 assert.equal(manifest.complete_cross_source_clusters_with_multiple_v4_urls,1);
 assert.equal(manifest.inferred_new_clusters,0);
});
