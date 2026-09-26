#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";

type Row = Record<string, any> & {
  url: string;
  contradiction_flags?: string[];
};

type Enrichment = Record<string, any> & {
  url: string;
};

const ALLOWED_FIELDS = [
  "title","description","price_mad","currency","city","district",
  "surface_m2","bedrooms","bathrooms","latitude","longitude",
  "agency_name","published_at","last_seen_at","freshness_status"
] as const;

function parseJsonl(path:string): any[] {
  return readFileSync(path,"utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line)=>JSON.parse(line));
}

function norm(v:any):any {
  if (typeof v === "string") {
    const s=v.trim();
    return s === "" ? null : s;
  }
  return v ?? null;
}

function same(a:any,b:any):boolean {
  const x=norm(a), y=norm(b);
  if (x===null || y===null) return x===y;
  if (typeof x==="number" && typeof y==="number") return x===y;
  return String(x).trim().toLowerCase()===String(y).trim().toLowerCase();
}

function main(){
  const [rowsPath,enrichmentPath,outPath,quarantinePath]=process.argv.slice(2);
  if(!rowsPath||!enrichmentPath||!outPath||!quarantinePath){
    throw new Error("usage: merge-enrichment-results.ts <rows.jsonl> <enrichment.jsonl> <out.jsonl> <quarantine.jsonl>");
  }

  const rows=parseJsonl(rowsPath) as Row[];
  const enrich=parseJsonl(enrichmentPath) as Enrichment[];
  const byUrl=new Map(enrich.map((e)=>[e.url,e]));
  const quarantine:any[]=[];
  let matched=0, filled=0, contradictions=0;

  for(const row of rows){
    const e=byUrl.get(row.url);
    if(!e) continue;
    matched++;
    row.contradiction_flags ??= [];

    for(const field of ALLOWED_FIELDS){
      const incoming=norm(e[field]);
      if(incoming===null) continue;
      const current=norm(row[field]);

      if(current===null){
        row[field]=incoming;
        filled++;
        continue;
      }

      if(!same(current,incoming)){
        const flag=`enrichment_conflict:${field}`;
        if(!row.contradiction_flags.includes(flag)) row.contradiction_flags.push(flag);
        quarantine.push({url:row.url,field,current,incoming});
        contradictions++;
      }
    }

    if(row.contradiction_flags.length>0){
      row.approved_for_import=false;
      row.status="contradiction_quarantine";
    }
  }

  writeFileSync(outPath,rows.map((r)=>JSON.stringify(r)).join("\n")+"\n");
  writeFileSync(quarantinePath,quarantine.map((r)=>JSON.stringify(r)).join("\n")+(quarantine.length?"\n":""));

  console.log(JSON.stringify({
    rows:rows.length,
    enrichment_rows:enrich.length,
    matched,
    filled_fields:filled,
    contradictions,
    database_access:0,
    database_writes:0,
    approved_for_import_rows:0
  },null,2));
}
main();
