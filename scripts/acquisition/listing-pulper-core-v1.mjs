import { createHash } from 'node:crypto';
export const sha256 = content => createHash('sha256').update(content).digest('hex');
const allowedSources = new Set(['mubawab.ma', 'avito.ma', 'yakeey.com', 'agenz.ma', 'masaken.ma', 'sarouty.ma']);
const normal = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const proper = v => typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g,' ').slice(0,120) : null;
const date = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(s) && Number.isFinite(Date.parse(s)) ? new Date(s).toISOString() : null;
const integer = (v,min,max) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max ? v : null;
const sourceHost = s => { try {const u = new URL(s); return u.protocol==='https:'&&!u.username&&!u.password ? u.hostname.replace(/^www\./,'').toLowerCase() : null;}catch{return null;} };
const contains = (list,item)=> Array.isArray(list)&&list.includes(item);
export function propertyType(title) {
  const s=normal(title);
  if(/\bstudio\b/.test(s)) return 'studio';
  if(/\bappartement\b|\bappartements\b/.test(s)) return 'apartment';
  if(/\bvilla\b/.test(s)) return 'villa';
  if(/\bmaison\b/.test(s)) return 'house';
  if(/\bterrain\b|\blot de terrain\b/.test(s)) return 'land';
  if(/\bbureau\b|\bbureaux\b|\bplateau professionnel\b/.test(s)) return 'office';
  if(/\bmagasin\b|\bcommerce\b|\blocal commercial\b/.test(s)) return 'commercial';
  return 'unknown';
}
export function verifyMold(mold) {
  if (!mold || mold.mold_id!=='AKARFINDER_PROPERTY_LISTING_V1' || mold.version!==1) throw new Error('mold_version_mismatch');
  const w=mold.technical_weights;
  if (!w || Object.values(w).some(v=>!Number.isSafeInteger(v)||v<0) || Object.values(w).reduce((a,b)=>a+b,0)!==100) throw new Error('invalid_technical_weights');
  const r=mold.ranking_components;
  if (!r || r.technical+r.freshness!==100 || r.technical<0 || r.freshness<0) throw new Error('invalid_rank_weights');
  if (!Array.isArray(mold.freshness_days) || !mold.freshness_days.length) throw new Error('missing_freshness_config');
  return mold;
}
export function inspectRaw(raw) {
  const problems=[];
  if (!raw || typeof raw!=='object'||Array.isArray(raw)) return ['invalid_raw_envelope'];
  if (!allowedSources.has(raw.source)) problems.push('source_unsupported');
  if (sourceHost(raw.source_url)!==raw.source) problems.push('source_url_host_mismatch');
  if (!date(raw.observed_at)) problems.push('invalid_observed_date');
  if (raw.http_status!==200) problems.push('http_not_200');
  if (typeof raw.markdown!=='string' || !raw.markdown.trim() || raw.markdown.length>300000) problems.push('missing_or_oversized_raw');
  if (typeof raw.source_identity!=='string' || !raw.source_identity.trim() || raw.source_identity.length>130) problems.push('invalid_source_identity');
  return problems;
}
export function freshness(dateString, evidence, observedDate, mold) {
  if (evidence!=='explicit_source_page' || !date(dateString) || !date(observedDate)) return {score:null, quality:'unverified'};
  const days = (Date.parse(observedDate)-Date.parse(dateString))/86400000;
  if (days<0 || days>3650) return {score:null, quality:'invalid_date'};
  return {score:mold.freshness_days.find(b=>days<=b.max)?.score ?? 0,quality:'source_date_observed'};
}
export function toMold(raw, primary, mold) {
  verifyMold(mold);
  const invalid=inspectRaw(raw);
  const snapshot_sha256=sha256(typeof raw?.markdown==='string'?raw.markdown:'');
  const source=raw?.source||null;
  const initialIssues=invalid.map(x=>'raw_'+x);
  const trusted=invalid.length===0 && primary && typeof primary==='object' && primary.source===source && primary.identity===raw.source_identity;
  const issues=[...initialIssues,...(trusted && Array.isArray(primary.issues)?primary.issues:[])];
  if (!trusted && !invalid.length) issues.push('parser_result_untrusted');
  const price=trusted?integer(primary.price_mad,200,1e9):null;
  const surface=trusted?integer(primary.surface_m2,5,100000):null;
  const verified=!!(trusted&&primary.identity_verified&&primary.primary_block_verified);
  const city=verified?proper(primary.city):null;
  const district=verified?proper(primary.district):null;
  const transaction=verified&&contains(['sale','rent'],primary.transaction)?primary.transaction:null;
  const period=verified&&contains(['total','month','night'],primary.price_period)?primary.price_period:null;
  const ptype=verified?propertyType(raw.title):'unknown';
  const bedrooms=verified?integer(primary.bedrooms,0,50):null;
  const publishedRaw=raw.source_published_at||null;
  const f=freshness(publishedRaw,raw.published_evidence,raw.observed_at,mold);
  const fields={source,source_identity:raw?.source_identity||null,source_url:raw?.source_url||null,city,district,property_type:ptype,transaction,price_mad:verified?price:null,price_period:period,surface_m2:verified?surface:null,surface_basis:verified&&contains(['habitable','total','headline','listed'],primary.surface_basis)?primary.surface_basis:null,bedrooms,published_at:f.quality==='source_date_observed'?date(publishedRaw):null,observed_at:date(raw?.observed_at)};
  const found=(key)=>key==='identity_verified'?verified:key==='property_type'?fields.property_type!=='unknown':fields[key]!==null&&fields[key]!==undefined;
  const technical_score=Object.entries(mold.technical_weights).reduce((sum,[key,w])=>sum+(found(key)?w:0),0);
  const penalty=Array.from(new Set(issues)).reduce((sum,k)=>sum+(mold.anomaly_penalties[k]||0),0);
  const ranking_score=Math.max(0,Math.min(100,Math.round((technical_score*mold.ranking_components.technical + (f.score ?? 0)*mold.ranking_components.freshness)/100)-penalty));
  const five_present=!!(verified&&city&&district&&price&&surface&&transaction);
  const majorIssues=['source_identity_not_confirmed','program_not_individual','pas_de_porte','price_per_m2','daily_or_nightly_rent','conflicting_primary_prices','conflicting_primary_areas'];
  const block=issues.some(x=>majorIssues.includes(x));
  const gate=invalid.length||!verified?'quarantine':block?'review_anomaly':five_present?'review_complete':'review_incomplete';
  const status={gate,score:{technical:technical_score,freshness:f.score,ranking:ranking_score,penalty},freshness_evidence:f.quality,issues:[...new Set(issues)],fields_5_present:five_present,availability_verified:false,physically_unique_verified:false,reuse_rights_verified:false,freshness_verified:f.quality==='source_date_observed',primary_fields_verified:five_present&&!block,eligible:false};
  return {mold_id:mold.mold_id,mold_version:mold.version,source_ref:{source,source_identity:fields.source_identity,source_url:fields.source_url,feenway_url:typeof raw?.feenway_url==='string'&&sourceHost(raw.feenway_url)==='feenway.com'?raw.feenway_url:null},provenance:{snapshot_sha256,parser_schema:trusted?primary.schema:null,observed_at:fields.observed_at,published_at_metadata:date(publishedRaw),published_evidence:raw?.published_evidence||'unknown'},fields,status};
}
export function processBatch(inputs, parse, mold) {
  verifyMold(mold);
  const output=[],seenSnapshots=new Set(),bySourceId=new Map();
  const stats={input_count:0,unique_snapshots:0,identities:0,same_snapshot_repeats:0,source_updates:0,quarantines:0,review_complete:0,review_incomplete:0,review_anomaly:0,eligible:0};
  for (const raw of inputs) {
    stats.input_count++;
    const sha=sha256(JSON.stringify(raw));
    if (seenSnapshots.has(sha)){stats.same_snapshot_repeats++;continue;}
    seenSnapshots.add(sha);
    const valid=inspectRaw(raw).length===0;
    let p=null;
    if (valid) {try{p=parse({source:raw.source,identity:raw.source_identity,original_url:raw.source_url,final_url:raw.final_url||raw.source_url,title:raw.title||'',text:raw.markdown,published_date:raw.source_published_at||null});}catch{p=null;}}
    const item=toMold(raw,p,mold);
    const key=String(item.source_ref.source)+'|'+String(item.source_ref.source_identity);
    if (bySourceId.has(key) && bySourceId.get(key)!==item.provenance.snapshot_sha256){stats.source_updates++;item.status.issues.push('source_content_updated');item.status.gate='review_anomaly';}
    bySourceId.set(key,item.provenance.snapshot_sha256);
    stats[item.status.gate==='quarantine'?'quarantines':item.status.gate]++;
    stats.unique_snapshots++;
    output.push(item);
  }
  stats.identities=bySourceId.size;
  return {output,stats};
}