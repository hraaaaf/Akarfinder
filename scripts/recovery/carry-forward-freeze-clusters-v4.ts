#!/usr/bin/env tsx
/**
 * Carry forward certified freeze property-cluster membership onto Clean Corpus V4 URLs.
 * Offline only; does not infer new clusters.
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createGunzip, gzipSync } from "node:zlib";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";

type Args={v4:string;sources:string;members:string;output:string};
function parse(argv:string[]):Args{
 const get=(f:string)=>{const i=argv.indexOf(f);return i>=0?argv[i+1]:undefined};
 const v4=get("--v4"),sources=get("--listing-sources"),members=get("--cluster-members"),output=get("--output");
 if(!v4||!sources||!members||!output) throw new Error("required: --v4 --listing-sources --cluster-members --output");
 return {v4,sources,members,output};
}
async function* gz(path:string){
 const rl=createInterface({input:createReadStream(path).pipe(createGunzip()),crlfDelay:Infinity});
 for await(const line of rl) if(line.trim()) yield JSON.parse(line);
}
async function main(){
 const a=parse(process.argv.slice(2));
 const v4=new Set<string>();
 for await(const r of gz(a.v4)){const u=canonicalizeSourceUrl(String(r.canonical_url||""));if(u)v4.add(u);}
 const source=new Map<number,{url:string;domain:string|null}>();
 for await(const r of gz(a.sources)){
  const id=Number(r.id),u=canonicalizeSourceUrl(String(r.listing_url||""));
  if(Number.isFinite(id)&&u)source.set(id,{url:u,domain:extractDomain(u)});
 }
 const clusters=new Map<string,Array<{source_offer_id:number;url:string;domain:string|null;origin_type:string|null}>>();
 for await(const r of gz(a.members)){
  const sid=Number(r.source_offer_id),s=source.get(sid); if(!s)continue;
  const cid=String(r.property_cluster_id||""); if(!cid)continue;
  const arr=clusters.get(cid)??[];
  arr.push({source_offer_id:sid,url:s.url,domain:s.domain,origin_type:r.origin_type??null});
  clusters.set(cid,arr);
 }
 const rows:any[]=[];let crossSourceClusters=0,completeCrossSourceInV4=0;
 for(const [cluster_id,members] of clusters){
  const unique=[...new Map(members.map(m=>[m.url,m])).values()];
  const domains=[...new Set(unique.map(m=>m.domain).filter(Boolean))];
  if(domains.length>1)crossSourceClusters++;
  const matched=unique.filter(m=>v4.has(m.url));
  if(!matched.length)continue;
  if(domains.length>1&&matched.length>1)completeCrossSourceInV4++;
  rows.push({
    cluster_id,
    cluster_origin:[...new Set(unique.map(m=>m.origin_type).filter(Boolean))],
    freeze_member_count:unique.length,
    freeze_domains:domains.sort(),
    v4_member_count:matched.length,
    v4_urls:matched.map(m=>m.url).sort(),
    evidence:"freeze:property_cluster_members",
    inferred_new_relation:false
  });
 }
 rows.sort((a,b)=>String(a.cluster_id).localeCompare(String(b.cluster_id)));
 const body=Buffer.from(rows.map(r=>JSON.stringify(r)).join("\n")+(rows.length?"\n":""));
 const out=gzipSync(body,{level:9});writeFileSync(a.output,out);
 const summary={
   schema_version:"akarfinder-v4-freeze-cluster-carry-forward-v1",
   freeze_clusters_with_v4_members:rows.length,
   v4_urls_covered:[...new Set(rows.flatMap(r=>r.v4_urls))].length,
   cross_source_clusters_in_freeze:crossSourceClusters,
   complete_cross_source_clusters_with_multiple_v4_urls:completeCrossSourceInV4,
   inferred_new_clusters:0,
   database_access:0,database_writes:0,
   sha256_gzip:createHash("sha256").update(out).digest("hex")
 };
 writeFileSync(a.output.replace(/\.jsonl\.gz$/,"-manifest.json"),JSON.stringify(summary,null,2)+"\n");
 console.log(JSON.stringify(summary,null,2));
}
void main().catch(e=>{console.error(e);process.exit(1)});
