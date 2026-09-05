import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as cheerio from 'cheerio';

const DETAIL_RE = /\/(?:fr|en)\/(?:a|pa)\/(\d+)(?:\/|$)/i;
const SHARD_RE = /\/fr\/(cc|ct|cd|sd)\//i;
const RANK = { cc: 0, ct: 1, cd: 2, sd: 3 };
const DEFAULT_DELAY_MS = 2750;
const UA = 'AkarFinder-surface-recovery/1.0 (+https://akarfinder.ma)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function normalizeText(value) {
  return String(value || '').replace(/\u00a0|\u202f/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseSurface(text) {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(/\b([0-9]{1,5}(?:[.,][0-9]+)?)\s*(?:m²|m2|m\s*2)\b/gi)]
    .map((m) => Math.round(Number.parseFloat(m[1].replace(',', '.'))))
    .filter((v) => Number.isInteger(v) && v >= 10 && v <= 100000);
  const unique = [...new Set(matches)];
  return unique.length === 1 ? unique[0] : null;
}

function candidateFromElement($, node) {
  const root = $(node);
  const values = new Set();
  root.find('[data-surface],[data-area],[itemprop="floorSize"]').addBack('[data-surface],[data-area],[itemprop="floorSize"]').each((_, el) => {
    const wrapped = $(el);
    for (const raw of [wrapped.attr('data-surface'), wrapped.attr('data-area'), wrapped.attr('content'), wrapped.text()]) {
      if (!raw) continue;
      const numeric = /^\s*[0-9]+(?:[.,][0-9]+)?\s*$/.test(raw) ? Math.round(Number.parseFloat(raw.replace(',', '.'))) : parseSurface(raw);
      if (Number.isInteger(numeric) && numeric >= 10 && numeric <= 100000) values.add(numeric);
    }
  });
  const text = normalizeText(root.text());
  const parsed = parseSurface(text);
  if (parsed !== null) values.add(parsed);
  if (values.size !== 1) return null;
  return { surface: [...values][0], context: text.slice(0, 800) };
}

export function extractSurfaceForListing(html, listingId) {
  const $ = cheerio.load(String(html || ''));
  const id = String(listingId);
  const anchors = [];
  $('a[href]').each((_, el) => {
    const match = (($(el).attr('href')) || '').match(DETAIL_RE);
    if (match?.[1] === id) anchors.push(el);
  });
  for (const anchor of anchors) {
    let node = anchor;
    for (let depth = 0; depth < 8 && node; depth += 1) {
      const found = candidateFromElement($, node);
      if (found) return { ...found, evidence: `ancestor_${depth}` };
      const parent = $(node).parent().get(0);
      if (!parent) break;
      if (normalizeText($(parent).text()).length > 3500) break;
      node = parent;
    }
  }
  return null;
}

function headers(key) { return { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }; }
async function getAll(base, key, table, select, filter='') {
  const out=[];
  for (let offset=0;;offset+=1000) {
    const response=await fetch(`${base}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${offset}${filter}`,{headers:headers(key)});
    if(!response.ok) throw new Error(`${table} read failed ${response.status}: ${await response.text()}`);
    const batch=await response.json(); out.push(...batch); if(batch.length<1000) break;
  }
  return out;
}
async function patchRow(base,key,table,filter,payload){
  const response=await fetch(`${base}/rest/v1/${table}?${filter}`,{method:'PATCH',headers:{...headers(key),prefer:'return=minimal'},body:JSON.stringify(payload)});
  if(!response.ok) throw new Error(`${table} patch failed ${response.status}: ${await response.text()}`);
}
function isSafeShardUrl(raw){try{const u=new URL(raw);return u.protocol==='https:'&&['mubawab.ma','www.mubawab.ma'].includes(u.hostname.toLowerCase())&&SHARD_RE.test(u.pathname)&&!u.pathname.includes(':')&&u.searchParams.get('n')!=='1';}catch{return false;}}
function shardRank(url){return RANK[String(url).match(SHARD_RE)?.[1]?.toLowerCase()]??-1;}

async function loadTargets(base,key){
  const [sources,corpus]=await Promise.all([
    getAll(base,key,'listing_sources','id,property_listing_id,source_name,listing_url,source_url','&source_name=eq.mubawab'),
    getAll(base,key,'mubawab_listing_corpus_v1','source_listing_id,evidence_status','&evidence_status=eq.current_verified')
  ]);
  const current=new Set(corpus.map(r=>String(r.source_listing_id)));
  const propertyIds=[...new Set(sources.map(r=>r.property_listing_id).filter(Number.isFinite))];
  const properties=[];
  for(let i=0;i<propertyIds.length;i+=100){const ids=propertyIds.slice(i,i+100).join(',');const r=await fetch(`${base}/rest/v1/property_listings?select=id,surface_m2&id=in.(${ids})`,{headers:headers(key)});if(!r.ok)throw new Error(`property read failed ${r.status}`);properties.push(...await r.json());}
  const byId=new Map(properties.map(r=>[r.id,r]));
  return sources.flatMap(row=>{const raw=row.listing_url||row.source_url||'';const m=raw.match(DETAIL_RE);if(!m||!current.has(m[1]))return[];const p=byId.get(row.property_listing_id);if(p?.surface_m2!==null&&p?.surface_m2!==undefined&&p.surface_m2>0)return[];return[{...row,source_listing_id:m[1]}];});
}

async function loadShardMap(reportFiles,targetIds){
  const candidates=new Map([...targetIds].map(id=>[id,[]]));
  for(const file of reportFiles){const report=JSON.parse(await fs.readFile(file,'utf8'));for(const shard of report.shards||[]){if(shard?.fetchState!=='ok'||!isSafeShardUrl(shard.url))continue;for(const rawId of shard.listingIds||[]){const id=String(rawId);if(candidates.has(id))candidates.get(id).push(shard.url);}}}
  const chosen=new Map();
  for(const [id,urls] of candidates){const unique=[...new Set(urls)].sort((a,b)=>shardRank(b)-shardRank(a)||a.length-b.length||a.localeCompare(b));if(unique[0])chosen.set(id,unique[0]);}
  return chosen;
}

export async function runRecovery(){
  const supabaseUrl=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!supabaseUrl||!key)throw new Error('Supabase credentials are required');
  const base=supabaseUrl.replace(/\/$/,'');
  const reportFiles=(process.env.MUBAWAB_REPORT_FILES||'').split(',').map(v=>v.trim()).filter(Boolean);if(!reportFiles.length)throw new Error('MUBAWAB_REPORT_FILES is required');
  const delayMs=Number.parseInt(process.env.MUBAWAB_REQUEST_DELAY_MS||String(DEFAULT_DELAY_MS),10);
  const targets=await loadTargets(base,key);const targetById=new Map(targets.map(r=>[r.source_listing_id,r]));const shardById=await loadShardMap(reportFiles,new Set(targetById.keys()));
  const idsByShard=new Map();for(const [id,shard] of shardById){if(!idsByShard.has(shard))idsByShard.set(shard,[]);idsByShard.get(shard).push(id);}
  const recovered=[],unresolved=[];let requests=0,stoppedEarly=null,lastStarted=0;
  for(const [shardUrl,ids] of idsByShard){const rem=delayMs-(Date.now()-lastStarted);if(lastStarted&&rem>0)await sleep(rem);lastStarted=Date.now();const response=await fetch(shardUrl,{headers:{'user-agent':UA,accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5','accept-language':'fr-MA,fr;q=0.9'}});requests++;if(response.status===429){stoppedEarly='http_429';break;}if(!response.ok){for(const id of ids)unresolved.push({source_listing_id:id,reason:`http_${response.status}`,shard_url:shardUrl});continue;}const html=await response.text();for(const id of ids){const parsed=extractSurfaceForListing(html,id);if(!parsed){unresolved.push({source_listing_id:id,reason:'surface_not_found_on_shard',shard_url:shardUrl});continue;}const target=targetById.get(id);const now=new Date().toISOString();await patchRow(base,key,'property_listings',`id=eq.${target.property_listing_id}&surface_m2=is.null`,{surface_m2:parsed.surface,updated_at:now});recovered.push({source_listing_id:id,property_listing_id:target.property_listing_id,surface_m2:parsed.surface,shard_url:shardUrl,evidence:parsed.evidence});}}
  for(const t of targets)if(!shardById.has(t.source_listing_id))unresolved.push({source_listing_id:t.source_listing_id,reason:'no_shard_attribution'});
  const report={success:stoppedEarly===null,targetCurrentDetailNoSurfaceCount:targets.length,mappedToShardCount:shardById.size,uniqueShardRequestCount:requests,recoveredSurfaceCount:recovered.length,unresolvedCount:unresolved.length,stoppedEarly,zeroDetailPageRequests:true,requestDelayMs:delayMs,recovered,unresolved};
  const outDir='artifacts/mubawab-surface-recovery';await fs.mkdir(outDir,{recursive:true});await fs.writeFile(path.join(outDir,'report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(outDir,'report.md'),[`# Mubawab current surface recovery`,'',`- Success: **${report.success?'YES':'NO'}**`,`- Current detail targets without surface: **${targets.length}**`,`- Targets mapped to certified safe shards: **${shardById.size}**`,`- Safe shard requests: **${requests}**`,`- Surfaces recovered: **${recovered.length}**`,`- Unresolved: **${unresolved.length}**`,`- Detail page requests: **0**`,`- Early stop: **${stoppedEarly||'none'}**`].join('\n'));
  console.log(JSON.stringify({...report,recovered:undefined,unresolved:undefined},null,2));if(!report.success)process.exitCode=2;return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await runRecovery();
