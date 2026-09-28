#!/usr/bin/env node
import fs from "node:fs";
const args=process.argv.slice(2),v={};for(let i=0;i<args.length;i+=2)v[args[i]]=args[i+1];
for(const k of ["--mubawab","--agenz","--out-dir"])if(!v[k])throw new Error("missing "+k);
fs.mkdirSync(v["--out-dir"],{recursive:true});
const read=p=>fs.readFileSync(p,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const sig=(raw)=>{try{const u=new URL(raw);const p=u.pathname.split("/").filter(Boolean);return "/"+p.map((x,i)=>/^\d+$/.test(x)?":n":x.toLowerCase().replace(/\d+/g,":n")).join("/")}catch{return "BAD_URL"}};
const classify=(rows,source)=>{const m=new Map();for(const raw of rows){const s=sig(raw);m.set(s,(m.get(s)||0)+1)}return [...m.entries()].sort((a,b)=>b[1]-a[1]).map(([signature,count])=>({source,signature,count}))};
const mub=read(v["--mubawab"]),ag=read(v["--agenz"]);
const out=[...classify(mub,"mubawab.ma"),...classify(ag,"agenz.ma")];
const top=out.filter(x=>x.count>=5).sort((a,b)=>b.count-a.count);
fs.writeFileSync(v["--out-dir"]+"/route-families.json",JSON.stringify(top,null,2)+"\n");
fs.writeFileSync(v["--out-dir"]+"/summary.json",JSON.stringify({schema_version:"akarfinder-v4.11-wave14-route-family-classification-20260928",input_rows:{mubawab:mub.length,agenz:ag.length},families_total:out.length,families_ge5:top.length,database_access:0,database_writes:0,source_page_fetches:0,warc_downloads:0,approved_for_import_rows:0,vercel_deployment:false},null,2)+"\n");
console.log(JSON.stringify({mubawab:mub.length,agenz:ag.length,top:top.slice(0,40)},null,2));
