import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const DETAIL_RE = /\/(?:fr|en)\/(?:a|pa)\/(\d+)(?:\/|$)/i;
const SHARD_RE = /\/fr\/(cc|ct|cd|sd)\//i;
const RANK = { cc: 0, ct: 1, cd: 2, sd: 3 };
const DEFAULT_DELAY_MS = 2750;
const UA = 'AkarFinder-district-diagnostic/1.0 (+https://akarfinder.ma)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeText(value) {
  return String(value || '').replace(/\u00a0|\u202f/g, ' ').replace(/\s+/g, ' ').trim();
}
function headers(key) { return { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }; }
async function getAll(base,key,table,select,filter='') {
  const out=[];
  for(let offset=0;;offset+=1000){
    const r=await fetch(`${base}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${offset}${filter}`,{headers:headers(key)});
    if(!r.ok) throw new Error(`${table} read failed ${r.status}: ${await r.text()}`);
    const batch=await r.json(); out.push(...batch); if(batch.length<1000) break;
  }
  return out;
}
function isSafeShardUrl(raw){try{const u=new URL(raw);return u.protocol==='https:'&&['mubawab.ma','www.mubawab.ma'].includes(u.hostname.toLowerCase())&&SHARD_RE.test(u.pathname)&&!u.pathname.includes(':')&&u.searchParams.get('n')!=='1';}catch{return false;}}
function shardRank(url){return RANK[String(url).match(SHARD_RE)?.[1]?.toLowerCase()]??-1;}

async function loadTargets(base,key){
  const [sources,corpus]=await Promise.all([
    getAll(base,key,'listing_sources','id,property_listing_id,source_name,listing_url,source_url','&source_name=eq.mubawab'),
    getAll(base,key,'mubawab_listing_corpus_v1','source_listing_id,evidence_status','&evidence_status=eq.current_verified')
  ]);
  const current=new Set(corpus.map(r=>String(r.source_listing_id)));
  const pids=[...new Set(sources.map(r=>r.property_listing_id).filter(Number.isFinite))];
  const props=[];
  for(let i=0;i<pids.length;i+=100){
    const ids=pids.slice(i,i+100).join(',');
    const r=await fetch(`${base}/rest/v1/property_listings?select=id,city,title,district&id=in.(${ids})`,{headers:headers(key)});
    if(!r.ok) throw new Error(`property read failed ${r.status}`);
    props.push(...await r.json());
  }
  const byId=new Map(props.map(r=>[r.id,r]));
  return sources.flatMap(row=>{
    const raw=row.listing_url||row.source_url||''; const m=raw.match(DETAIL_RE); if(!m||!current.has(m[1])) return [];
    const p=byId.get(row.property_listing_id); if(!p || (p.district && String(p.district).trim())) return [];
    return [{...row,source_listing_id:m[1],city:p.city,title:p.title,district:p.district}];
  });
}
async function loadShardMap(reportFiles,targetIds){
  const candidates=new Map([...targetIds].map(id=>[id,[]]));
  for(const file of reportFiles){
    const report=JSON.parse(await fs.readFile(file,'utf8'));
    for(const shard of report.shards||[]){
      if(shard?.fetchState!=='ok'||!isSafeShardUrl(shard.url)) continue;
      for(const rawId of shard.listingIds||[]){const id=String(rawId);if(candidates.has(id)) candidates.get(id).push(shard.url);}
    }
  }
  const chosen=new Map();
  for(const [id,urls] of candidates){const unique=[...new Set(urls)].sort((a,b)=>shardRank(b)-shardRank(a)||a.length-b.length||a.localeCompare(b)); if(unique[0]) chosen.set(id,{chosen:unique[0],all:unique});}
  return chosen;
}
function cardContext(html,id){
  const $=cheerio.load(String(html||''));
  const anchors=[];
  $('a[href]').each((_,el)=>{const m=(($(el).attr('href'))||'').match(DETAIL_RE);if(m?.[1]===String(id)) anchors.push(el);});
  for(const anchor of anchors){
    let node=anchor;
    for(let depth=0;depth<8&&node;depth+=1){
      const text=normalizeText($(node).text());
      if(/\b(?:m²|m2|m\s*2|Pi[eè]ces?|Chambres?|Salles? de bain)/iu.test(text) && text.length<3500) return {text,depth,anchorCount:anchors.length};
      const parent=$(node).parent().get(0); if(!parent) break; node=parent;
    }
  }
  return {text:null,depth:null,anchorCount:anchors.length};
}
function locationCandidates(text,city){
  if(!text||!city) return [];
  const escaped=String(city).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(`([^,]{2,80}),\\s*${escaped}(?=\\s|$)`,'giu');
  const out=[];
  for(const m of text.matchAll(re)){
    let candidate=normalizeText(m[1]);
    candidate=candidate.replace(/^.*?(?:DH|Prix à consulter)\s+/iu,'');
    const words=candidate.split(/\s+/).filter(Boolean);
    if(words.length>8) candidate=words.slice(-8).join(' ');
    if(candidate && candidate.toLocaleLowerCase('fr')!==String(city).toLocaleLowerCase('fr')) out.push(candidate);
  }
  return [...new Set(out)];
}

async function main(){
  const supabaseUrl=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!supabaseUrl||!key) throw new Error('Supabase credentials are required');
  const files=(process.env.MUBAWAB_REPORT_FILES||'').split(',').map(v=>v.trim()).filter(Boolean); if(!files.length) throw new Error('MUBAWAB_REPORT_FILES is required');
  const base=supabaseUrl.replace(/\/$/,''); const delay=Number.parseInt(process.env.MUBAWAB_REQUEST_DELAY_MS||String(DEFAULT_DELAY_MS),10);
  const targets=await loadTargets(base,key); const byId=new Map(targets.map(t=>[t.source_listing_id,t])); const shardMap=await loadShardMap(files,new Set(byId.keys()));
  const idsByShard=new Map(); for(const [id,meta] of shardMap){if(!idsByShard.has(meta.chosen))idsByShard.set(meta.chosen,[]);idsByShard.get(meta.chosen).push(id);}
  const results=[]; let requests=0,last=0,stoppedEarly=null;
  for(const [url,ids] of idsByShard){
    const rem=delay-(Date.now()-last); if(last&&rem>0) await sleep(rem); last=Date.now();
    const r=await fetch(url,{headers:{'user-agent':UA,accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5','accept-language':'fr-MA,fr;q=0.9'}}); requests++;
    if(r.status===429){stoppedEarly='http_429';break;} const html=r.ok?await r.text():'';
    for(const id of ids){
      const target=byId.get(id), ctx=r.ok?cardContext(html,id):{text:null,depth:null,anchorCount:0};
      results.push({source_listing_id:id,property_listing_id:target.property_listing_id,city:target.city,title:target.title,shard_url:url,all_shards:shardMap.get(id).all,http_status:r.status,anchor_count:ctx.anchorCount,context:ctx.text,location_candidates:locationCandidates(ctx.text,target.city)});
    }
  }
  for(const t of targets) if(!shardMap.has(t.source_listing_id)) results.push({source_listing_id:t.source_listing_id,property_listing_id:t.property_listing_id,city:t.city,title:t.title,reason:'no_shard_attribution',location_candidates:[]});
  const counts={
    single_location_candidate:results.filter(r=>r.location_candidates?.length===1).length,
    multiple_location_candidates:results.filter(r=>(r.location_candidates?.length||0)>1).length,
    no_location_candidate:results.filter(r=>(r.location_candidates?.length||0)===0).length,
  };
  const report={success:stoppedEarly===null,targetCount:targets.length,mappedCount:shardMap.size,requests,stoppedEarly,zeroWrites:true,zeroDetailPageRequests:true,counts,results};
  const dir='artifacts/mubawab-district-diagnostic'; await fs.mkdir(dir,{recursive:true}); await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));
  await fs.writeFile(path.join(dir,'report.md'),[`# Mubawab district diagnostic`,'',`- Targets: **${targets.length}**`,`- Requests: **${requests}**`,`- Zero writes: **YES**`,`- Detail requests: **0**`,'',...Object.entries(counts).map(([k,v])=>`- ${k}: **${v}**`)].join('\n'));
  console.log(JSON.stringify({...report,results:undefined},null,2)); if(!report.success) process.exitCode=2;
}
await main();
