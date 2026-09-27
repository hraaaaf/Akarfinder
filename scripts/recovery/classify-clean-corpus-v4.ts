#!/usr/bin/env tsx
/**
 * AKARFINDER DB RECOVERY — CLEAN CORPUS V4
 * Offline-only classifier. No DB client, no network, no publication.
 *
 * Inputs:
 *   --representations <listing_representations.jsonl.gz>
 *   --listing-sources <listing_sources.jsonl.gz>
 *   --observations <source_offer_observations.jsonl.gz>
 *   --reservoir <txt>   (repeatable; already structurally filtered recovery URLs)
 *   --output <jsonl.gz>
 *   --manifest <json>
 *
 * Doctrine:
 * - KEEP every real-estate detail candidate unless strong expiry evidence exists.
 * - EXPIRED only from latest explicit source observation = inactive.
 * - NON_REAL_ESTATE is not inferred from low score, age, missing price or sparse fields.
 * - approved_for_import always remains false in this stage.
 */
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createGunzip, gzipSync } from "node:zlib";
import { createInterface } from "node:readline";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";

type Args={
  representations:string; listingSources:string; observations:string;
  reservoirs:string[]; output:string; manifest:string;
};
function args(argv:string[]):Args{
  const one=(f:string)=>{const i=argv.indexOf(f);return i>=0?argv[i+1]:undefined};
  const reservoirs:string[]=[];
  argv.forEach((v,i)=>{if(v==="--reservoir"&&argv[i+1])reservoirs.push(argv[i+1]);});
  const representations=one("--representations"),listingSources=one("--listing-sources"),
    observations=one("--observations"),output=one("--output"),manifest=one("--manifest");
  if(!representations||!listingSources||!observations||!output||!manifest||reservoirs.length===0)
    throw new Error("missing required args");
  return {representations,listingSources,observations,reservoirs,output,manifest};
}
async function* gzJsonl(path:string){
  const rl=createInterface({input:createReadStream(path).pipe(createGunzip()),crlfDelay:Infinity});
  for await(const line of rl){if(line.trim())yield JSON.parse(line);}
}
function canon(v:unknown){return typeof v==="string"?canonicalizeSourceUrl(v):null;}

async function main(){
  const a=args(process.argv.slice(2));
  const provenance=new Map<string,Set<string>>();
  const eligible=new Set<string>();
  for await(const r of gzJsonl(a.representations)){
    if(!["eligible_primary","eligible_secondary"].includes(String(r.display_eligibility)))continue;
    const u=canon(r.canonical_url); if(!u)continue;
    eligible.add(u); provenance.set(u,new Set(["freeze:listing_representations:display_eligible"]));
  }
  const reservoir=new Set<string>();
  for(const p of a.reservoirs){
    for(const raw of readFileSync(p,"utf8").split(/\r?\n/)){
      const u=canon(raw); if(!u)continue;
      reservoir.add(u);
      const s=provenance.get(u)??new Set<string>(); s.add("recovery_artifact:"+p); provenance.set(u,s);
    }
  }
  const sourceUrl=new Map<number,string>();
  for await(const r of gzJsonl(a.listingSources)){
    const u=canon(r.listing_url);
    if(u&&Number.isInteger(r.id))sourceUrl.set(r.id,u);
  }
  const latest=new Map<number,{at:string,status:string,origin:string|null}>();
  for await(const r of gzJsonl(a.observations)){
    const id=Number(r.source_offer_id); if(!Number.isFinite(id))continue;
    const at=String(r.observed_at??""); const prev=latest.get(id);
    if(!prev||at>prev.at)latest.set(id,{at,status:String(r.source_status??""),origin:r.observation_origin??null});
  }
  const statusByUrl=new Map<string,{at:string,status:string,origin:string|null}>();
  for(const [id,v] of latest){const u=sourceUrl.get(id);if(u)statusByUrl.set(u,v);}

  const union=new Set([...eligible,...reservoir]);
  const rows=[...union].sort().map(u=>{
    const obs=statusByUrl.get(u);
    const expired=obs?.status==="inactive";
    const evidence=[...(provenance.get(u)??[])];
    if(obs)evidence.push(`freeze:latest_source_observation:${obs.status}:${obs.at}:${obs.origin??"unknown"}`);
    return {
      canonical_url:u,source_domain:extractDomain(u),
      classification:expired?"EXPIRED":"KEEP",
      classification_reason:expired?"latest_source_observation_inactive":"real_estate_candidate_no_strong_expiry_evidence",
      from_freeze_eligible:eligible.has(u),from_recovery_reservoir:reservoir.has(u),
      evidence,approved_for_import:false
    };
  });
  const body=Buffer.from(rows.map(r=>JSON.stringify(r)).join("\n")+"\n");
  const gz=gzipSync(body,{level:9}); writeFileSync(a.output,gz);
  const counts=rows.reduce<Record<string,number>>((m,r)=>(m[r.classification]=(m[r.classification]??0)+1,m),{});
  const manifest={
    schema_version:"akarfinder-clean-corpus-v4-classification-v1",
    rows:rows.length,freeze_eligible_unique:eligible.size,recovery_reservoir_unique:reservoir.size,
    overlap:[...eligible].filter(u=>reservoir.has(u)).length,classification_counts:counts,
    approved_for_import_rows:0,database_access:0,database_writes:0,
    sha256_gzip:createHash("sha256").update(gz).digest("hex")
  };
  writeFileSync(a.manifest,JSON.stringify(manifest,null,2)+"\n");
  console.log(JSON.stringify(manifest,null,2));
}
void main().catch(e=>{console.error(e);process.exit(1);});
