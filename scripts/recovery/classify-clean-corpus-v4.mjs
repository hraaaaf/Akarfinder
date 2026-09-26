#!/usr/bin/env node
import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';
import crypto from 'node:crypto';

function arg(name) { const i=process.argv.indexOf(name); return i>=0 ? process.argv[i+1] : null; }
const input=arg('--input'), output=arg('--output'), manifestPath=arg('--manifest');
if(!input||!output||!manifestPath) throw new Error('usage: classify-clean-corpus-v4.mjs --input <jsonl[.gz]> --output <jsonl.gz> --manifest <json>');

const manualKeep = new Set(['sarouty.ma:816935','avito.ma:57275227','avito.ma:55718156','avito.ma:56197166','avito.ma:57082979','mubawab.ma:8178759']);
const manualExpired = new Set(['sarouty.ma:894278','sarouty.ma:868140','sarouty.ma:854148','avito.ma:56197165','avito.ma:57083720','avito.ma:54965575','avito.ma:57118364','mubawab.ma:7781144','mubawab.ma:8176614']);
const manualNonRealEstate = new Set(['avito.ma:57118502']);

function sourceId(url) {
  const u=new URL(url); const host=u.hostname.replace(/^www\./,'').toLowerCase(); const p=decodeURIComponent(u.pathname).toLowerCase().replace(/\/+$/,'');
  let m;
  if(host==='avito.ma' && (m=p.match(/_(\d{7,})\.htm$/))) return `${host}:${m[1]}`;
  if(host==='mubawab.ma' && (m=p.match(/\/(?:a|pa)\/(\d+)/))) return `${host}:${m[1]}`;
  if(host==='sarouty.ma' && (m=p.match(/-(\d+)(?:\.html)?$/))) return `${host}:${m[1]}`;
  return null;
}

function sourceIdentityKey(url) {
  const u=new URL(url); const d=u.hostname.replace(/^www\./,'').toLowerCase(); const p=decodeURIComponent(u.pathname).toLowerCase().replace(/\/+$/,'');
  const id=(re,prefix='id')=>{const m=p.match(re);return m?.[1]?`${d}:${prefix}:${m[1].toLowerCase()}`:null};
  if(['sarout.ma','marocannonces.com'].includes(d)) return id(/\/annonce\/(\d+)(?:\/|$)/)??`${d}:url:${p}`;
  if(d==='barnes-marrakech.com') return id(/\/(\d+)$/)??`${d}:url:${p}`;
  if(d==='sarouty.ma') return id(/-(\d+)(?:\.html)?$/)??`${d}:url:${p}`;
  if(d==='agenz.ma') return id(/\/(\d+)$/)??`${d}:url:${p}`;
  if(d==='avito.ma') return id(/_(\d{7,})\.htm$/)??`${d}:url:${p}`;
  if(d==='1immo.ma') return id(/-(\d+)$/)??`${d}:url:${p}`;
  if(d==='kawtarimmobilier.com') return id(/ref-(\d+)\.html$/,'ref')??`${d}:url:${p}`;
  if(d==='mouldar.com') return id(/\/([a-f0-9]{6,})$/,'hex')??`${d}:url:${p}`;
  if(d==='masaken.ma'||d==='soukimmobilier.com') return id(/\/(\d+)$/)??`${d}:url:${p}`;
  if(d==='mubawab.ma'){const m=p.match(/\/(a|pa)\/(\d+)/); if(m)return `${d}:${m[1]}:${m[2]}`;}
  if(d==='aykana.ma'){const m=p.match(/ref[-\s]*(\d+)/); if(m)return `${d}:ref:${m[1]}`;}
  if(d==='promoimmomarrakech.com'){const m=p.match(/\/produit\/([^/]+)\//); if(m)return `${d}:code:${m[1].replace(/\s+/g,'')}`;}
  if(d==='domio.ma') return id(/\/(\d+)\/[^/]+$/)??`${d}:url:${p}`;
  return `${d}:url:${p}`;
}

const counts={KEEP:0,EXPIRED:0,NON_REAL_ESTATE:0}; const confidence={high:0,medium:0,low:0}; const candidateKinds={}; let rows=0;
const inStream=fs.createReadStream(input); const decoded=input.endsWith('.gz')?inStream.pipe(zlib.createGunzip()):inStream;
const gzip=zlib.createGzip({level:9}); const sink=fs.createWriteStream(output); gzip.pipe(sink);
const rl=readline.createInterface({input:decoded,crlfDelay:Infinity});
for await (const line of rl) {
  if(!line.trim()) continue; const r=JSON.parse(line); rows++;
  const reasons=new Set(r.classification_reasons??[]); const sid=sourceId(r.canonical_url);
  r.source_identity_key=sourceIdentityKey(r.canonical_url); r.approved_for_import=false;

  const url=new URL(r.canonical_url);
  const host=url.hostname.replace(/^www\./,'').toLowerCase();
  if(r.candidate_kind==='unverified_listing_candidate' && host==='mubawab.ma' && /\/fr\/a\/\d+\//.test(url.pathname)) {
    r.candidate_kind='detail_likely';
    if(r.classification_confidence==='low') r.classification_confidence='medium';
    reasons.add('registry_strong_individual_mubawab_a_numeric_id');
  }

  if(sid && manualExpired.has(sid)) { r.classification='EXPIRED'; r.classification_confidence='high'; reasons.clear(); reasons.add('manual_target_detail_redirected_or_unavailable_2026-09-26'); }
  else if(sid && manualNonRealEstate.has(sid)) { r.classification='NON_REAL_ESTATE'; r.classification_confidence='high'; reasons.clear(); reasons.add('manual_non_real_estate_audit_2026-09-26'); }
  else if(r.candidate_kind==='category_or_index') { r.classification='NON_REAL_ESTATE'; r.classification_confidence='high'; reasons.add('freeze_document_kind_category_not_individual_listing'); }
  else {
    r.classification='KEEP';
    if(sid && manualKeep.has(sid)) { r.classification_confidence='high'; reasons.add('manual_live_detail_audit_2026-09-26'); }
    if(r.deep_http_status===200 || r.freshness_status==='live_http_200_2026-09-25') { r.classification_confidence='high'; reasons.add('deep_public_http_200_2026-09-25'); }
    reasons.add('keep_by_default_no_strong_expiry_evidence');
  }

  r.classification_reasons=[...reasons].sort();
  counts[r.classification]=(counts[r.classification]??0)+1;
  confidence[r.classification_confidence]=(confidence[r.classification_confidence]??0)+1;
  candidateKinds[r.candidate_kind]=(candidateKinds[r.candidate_kind]??0)+1;
  gzip.write(JSON.stringify(r)+'\n');
}
gzip.end(); await new Promise((res,rej)=>{sink.on('close',res);sink.on('error',rej)});
const sha=crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
const manifest={schema_version:'akarfinder-clean-corpus-v4-classifier-v2',rows,classification_counts:counts,classification_confidence:confidence,candidate_kind_counts:candidateKinds,approved_for_import_rows:0,database_access:0,database_writes:0,sha256_gzip:sha,doctrine:'KEEP by default; only strong evidence can yield EXPIRED/NON_REAL_ESTATE; transient HTTP failures never imply expiry'};
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n'); console.log(JSON.stringify(manifest,null,2));
