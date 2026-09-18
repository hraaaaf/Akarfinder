import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const DETAIL_RE = /\/(?:fr|en)\/(?:a|pa)\/(\d+)(?:\/|$)/i;
const SHARD_RE = /\/fr\/(cc|ct|cd|sd)\//i;
const RANK = { cc: 0, ct: 1, cd: 2, sd: 3 };
const DEFAULT_DELAY_MS = 2750;
const UA = 'AkarFinder-surface-diagnostic/1.0 (+https://akarfinder.ma)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizeText = (v) => String(v || '').replace(/\u00a0|\u202f/g, ' ').replace(/\s+/g, ' ').trim();

function parseSurfaceTokens(text) {
  const normalized = normalizeText(text);
  const values = [];
  const re = /\b([0-9]{1,5}(?:[.,][0-9]{1,2})?)\s*m(?:²|2)\b/gi;
  for (const match of normalized.matchAll(re)) {
    const value = Number.parseFloat(match[1].replace(',', '.'));
    if (Number.isFinite(value) && value >= 10 && value <= 200000) values.push(value);
  }
  return [...new Set(values)];
}

function inspectListing(html, listingId) {
  const $ = cheerio.load(String(html || ''));
  const id = String(listingId);
  const anchors = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const match = href.match(DETAIL_RE);
    if (match?.[1] === id) anchors.push(el);
  });
  if (!anchors.length) return { reason: 'id_not_found_on_current_shard', anchorCount: 0 };

  const contexts = [];
  for (const anchor of anchors) {
    let node = anchor;
    for (let depth = 0; depth < 10 && node; depth += 1) {
      const text = normalizeText($(node).text());
      const values = parseSurfaceTokens(text);
      if (text) contexts.push({ depth, textLength: text.length, values, text: text.slice(0, 1200) });
      const parent = $(node).parent().get(0);
      if (!parent) break;
      if (normalizeText($(parent).text()).length > 5000) break;
      node = parent;
    }
  }

  const anyValues = [...new Set(contexts.flatMap((c) => c.values))];
  const firstScoped = contexts.find((c) => c.values.length > 0 && c.textLength <= 3500);
  if (firstScoped?.values.length === 1) {
    return { reason: 'recoverable_parser_miss', anchorCount: anchors.length, candidateSurface: firstScoped.values[0], evidenceDepth: firstScoped.depth, context: firstScoped.text };
  }
  if (firstScoped?.values.length > 1 || anyValues.length > 1) {
    return { reason: 'surface_ambiguous_multiple_values', anchorCount: anchors.length, candidates: anyValues.slice(0, 20), context: (firstScoped || contexts.find(c => c.values.length))?.text || null };
  }
  return { reason: 'surface_absent_in_card_context', anchorCount: anchors.length, context: contexts.at(-1)?.text || null };
}

function isSafeShardUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && ['mubawab.ma','www.mubawab.ma'].includes(url.hostname.toLowerCase()) && SHARD_RE.test(url.pathname) && !url.pathname.includes(':') && url.searchParams.get('n') !== '1';
  } catch { return false; }
}
function shardRank(url) { return RANK[String(url).match(SHARD_RE)?.[1]?.toLowerCase()] ?? -1; }
function headers(key) { return { apikey:key, authorization:`Bearer ${key}`, 'content-type':'application/json' }; }
async function getAll(base,key,table,select,filter='') {
  const out=[]; for(let offset=0;;offset+=1000){
    const r=await fetch(`${base}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${offset}${filter}`,{headers:headers(key)});
    if(!r.ok) throw new Error(`${table} read failed ${r.status}: ${await r.text()}`);
    const b=await r.json(); out.push(...b); if(b.length<1000) break;
  } return out;
}
async function loadTargets(base,key){
  const [sources,corpus]=await Promise.all([
    getAll(base,key,'listing_sources','id,property_listing_id,source_name,listing_url,source_url','&source_name=eq.mubawab'),
    getAll(base,key,'mubawab_listing_corpus_v1','source_listing_id,evidence_status','&evidence_status=eq.current_verified')
  ]);
  const current=new Set(corpus.map(r=>String(r.source_listing_id)));
  const propertyIds=[...new Set(sources.map(r=>r.property_listing_id).filter(Number.isFinite))];
  const properties=[];
  for(let i=0;i<propertyIds.length;i+=100){
    const ids=propertyIds.slice(i,i+100).join(',');
    const r=await fetch(`${base}/rest/v1/property_listings?select=id,surface_m2,city,title,district&id=in.(${ids})`,{headers:headers(key)});
    if(!r.ok) throw new Error(`property read failed ${r.status}: ${await r.text()}`);
    properties.push(...await r.json());
  }
  const pmap=new Map(properties.map(r=>[r.id,r]));
  return sources.flatMap(row=>{
    const url=row.listing_url||row.source_url||''; const m=url.match(DETAIL_RE); if(!m) return [];
    const id=m[1], p=pmap.get(row.property_listing_id); if(!current.has(id)||p?.surface_m2!=null) return [];
    return [{source_listing_id:id, source_id:row.id, property_listing_id:row.property_listing_id, listing_url:url, ...p}];
  });
}
async function loadShardMap(reportFiles,targetIds){
  const c=new Map([...targetIds].map(id=>[id,[]]));
  for(const file of reportFiles){
    const report=JSON.parse(await fs.readFile(file,'utf8'));
    for(const shard of report.shards||[]){ if(shard?.fetchState!=='ok'||!isSafeShardUrl(shard.url)) continue;
      for(const rawId of shard.listingIds||[]){const id=String(rawId); if(c.has(id)) c.get(id).push(shard.url);}
    }
  }
  const out=new Map(); for(const [id,urls] of c){ const unique=[...new Set(urls)].sort((a,b)=>shardRank(b)-shardRank(a)||a.length-b.length||a.localeCompare(b)); if(unique[0]) out.set(id,unique[0]); }
  return out;
}

const supabaseUrl=process.env.SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!supabaseUrl||!key) throw new Error('Supabase credentials are required');
const reportFiles=(process.env.MUBAWAB_REPORT_FILES||'').split(',').map(v=>v.trim()).filter(Boolean); if(!reportFiles.length) throw new Error('MUBAWAB_REPORT_FILES is required');
const delayMs=Number.parseInt(process.env.MUBAWAB_REQUEST_DELAY_MS||String(DEFAULT_DELAY_MS),10);
const base=supabaseUrl.replace(/\/$/,''); const targets=await loadTargets(base,key); const tmap=new Map(targets.map(t=>[t.source_listing_id,t]));
const shardById=await loadShardMap(reportFiles,new Set(tmap.keys())); const idsByShard=new Map();
for(const [id,shard] of shardById){ if(!idsByShard.has(shard)) idsByShard.set(shard,[]); idsByShard.get(shard).push(id); }
const results=[]; let requests=0,lastStarted=0,stoppedEarly=null;
for(const [shardUrl,ids] of idsByShard){ const remaining=delayMs-(Date.now()-lastStarted); if(lastStarted&&remaining>0) await sleep(remaining); lastStarted=Date.now();
  const r=await fetch(shardUrl,{headers:{'user-agent':UA,accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5','accept-language':'fr-MA,fr;q=0.9'}}); requests++;
  if(r.status===429){stoppedEarly='http_429';break;} if(!r.ok){for(const id of ids) results.push({...tmap.get(id),shard_url:shardUrl,reason:`http_${r.status}`});continue;}
  const html=await r.text(); for(const id of ids) results.push({...tmap.get(id),shard_url:shardUrl,...inspectListing(html,id)});
}
for(const t of targets) if(!shardById.has(t.source_listing_id)) results.push({...t,reason:'no_shard_attribution'});
const counts={}; for(const r of results) counts[r.reason]=(counts[r.reason]||0)+1;
const report={success:stoppedEarly===null,targetCount:targets.length,mappedCount:shardById.size,requests,stoppedEarly,zeroWrites:true,zeroDetailPageRequests:true,counts,results};
const outDir='artifacts/mubawab-surface-diagnostic'; await fs.mkdir(outDir,{recursive:true});
await fs.writeFile(path.join(outDir,'report.json'),JSON.stringify(report,null,2));
await fs.writeFile(path.join(outDir,'report.md'),['# Mubawab surface diagnostic','',`- Targets: **${targets.length}**`,`- Requests: **${requests}**`,`- Zero writes: **YES**`,`- Detail requests: **0**`,'',...Object.entries(counts).map(([k,v])=>`- ${k}: **${v}**`)].join('\n'));
console.log(JSON.stringify({...report,results:undefined},null,2));
if(stoppedEarly) process.exitCode=2;
