import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const requiredFields=['city','district','price_mad','surface_m2'];
const cityAliases=new Map(Object.entries({casablanca:'casablanca',marrakech:'marrakech',rabat:'rabat',tanger:'tanger',agadir:'agadir',fes:'fes',meknes:'meknes',kenitra:'kenitra',tetouan:'tetouan',oujda:'oujda'}));
function route(row){
 let url;
 try{url=new URL(row?.canonical_url);}catch{return {error:'invalid_detail_url'};}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.hostname.toLowerCase()!==row.source&&url.hostname.toLowerCase()!=='www.'+row.source)return {error:'untrusted_detail_url'};
 if(row.source==='mubawab.ma'){
  const m=url.pathname.match(/^\/(?:fr|en|ar|es|it|nl)\/a\/(\d+)(?:\/[^?#]*)?$/i);
  if(!m)return {error:'unsupported_source_route'};
  if(row.identity!=='a:'+m[1])return{error:'source_identity_url_mismatch'};
  return {adapter:'mubawab_card_v1',transaction:null,property_type:null};
 }
 if(row.source==='domio.ma'){
  const m=url.pathname.match(/^\/fr\/([a-z-]+)\/(vendre|louer)\/([a-z-]+)\/(\d+)\/[^/?#]+\/?$/i);
  if(!m)return {error:'unsupported_source_route'};
  if(row.identity!=='domio:'+m[4])return{error:'source_identity_url_mismatch'};
  return{adapter:'domio_card_v1',transaction:m[2]==='vendre'?'sale':'rent',property_type:m[1],city_slug:m[3]};
 }
 return{error:'unsupported_source'};
}
const inRange=(x,lo,hi)=>typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi;
const normVal=v=>typeof v==='string'&&normalize(v).length>=2&&normalize(v).length<=75;
export function inspectListingForSnapshot(row){
 const problems=[];const parsed=route(row);
 if(parsed.error)problems.push(parsed.error);
 if(!row?.five_field_observed_consistent)problems.push('no_consistent_complete_card');
 if(!Array.isArray(row?.cross_run_conflicts))problems.push('conflict_provenance_missing');
 else for(const field of row.cross_run_conflicts)problems.push('conflict_'+field);
 if(!Array.isArray(row?.complete_card_evidence)||!row.complete_card_evidence.length)problems.push('same_card_evidence_missing');
 if(!Array.isArray(row?.observed_in)||!row.observed_in.length)problems.push('source_artifact_unknown');
 for(const field of ['city','district'])if(!normVal(row?.[field]))problems.push('invalid_'+field);
 if(!inRange(row?.price_mad,1,1e10))problems.push('invalid_price_mad');
 if(!inRange(row?.surface_m2,5,100000))problems.push('invalid_surface_m2');
 if(parsed.city_slug&&cityAliases.has(normalize(parsed.city_slug))&&normalize(row.city)!==cityAliases.get(normalize(parsed.city_slug)))problems.push('city_disagrees_with_detail_route');
 if(parsed.transaction==='sale'&&!inRange(row.price_mad,50000,100000000))problems.push('price_out_of_sale_range');
 if(parsed.transaction==='rent'&&!inRange(row.price_mad,500,250000))problems.push('price_out_of_rental_range');
 if(parsed.property_type==='appartement'&&!inRange(row.surface_m2,5,3000))problems.push('apartment_surface_out_of_range');
 if(row?.potential_same_property_other_id===true)problems.push('potential_physical_duplicate_review');
 if(row?.freshness_certified===true||row?.active_sale_verified===true||row?.cross_source_deduplicated===true)problems.push('untrusted_certification_claim');
 const reasons=[...new Set(problems)].sort();
 const passed=reasons.length===0;
 const decision=passed?'candidate_snapshot_pass':reasons.includes('untrusted_detail_url')||reasons.includes('untrusted_certification_claim')?'reject_safety':
  reasons.some(x=>x.startsWith('conflict_'))?'hold_conflicting_sources':
  reasons.includes('potential_physical_duplicate_review')&&reasons.length===1?'hold_physical_review':'hold_parser_repair';
 const payload=passed?[row.source,row.identity,row.canonical_url,...requiredFields.map(k=>row[k]),[...row.observed_in].sort(),[...row.complete_card_evidence].map(x=>x.card_sha256).sort()]:null;
 return {decision,source_adapter:parsed.adapter??null,transaction_route:parsed.transaction??null,
  reasons,card_snapshot_sha256:passed?sha(JSON.stringify(payload)):null,commercially_available_certified:false,
  physically_unique_certified:false,production_publishable:false};
}
export function tamisReport(rows){
 const inspected=rows.map(row=>({...row,tamis:inspectListingForSnapshot(row)}));
 const counts={},reasons={},perSource={},repair={};
 for(const r of inspected){
  counts[r.tamis.decision]=(counts[r.tamis.decision]||0)+1;
  const s=perSource[r.source]??={total:0,passed:0,held:0,causes:{}};
  s.total++;
  if(r.tamis.decision==='candidate_snapshot_pass')s.passed++;else s.held++;
  for(const reason of r.tamis.reasons){
   reasons[reason]=(reasons[reason]||0)+1;
   s.causes[reason]=(s.causes[reason]||0)+1;
   const key=r.source+'|'+reason;
   const item=repair[key]??={source:r.source,cause:reason,affected:0,sample_ids:[],source_adapter:r.tamis.source_adapter};
   item.affected++;if(item.sample_ids.length<4)item.sample_ids.push(r.identity);
  }
 }
 const passed=counts.candidate_snapshot_pass||0,held=inspected.length-passed;
 const summary={schema_version:'AKARFINDER_PER_LISTING_TAMIS_V1',
  semantics:'snapshot_eligibility_only_not_freshness_availability_physical_uniqueness_or_publication',
  source_ids_inspected:inspected.length,candidate_snapshot_pass:passed,quarantined_for_repair_or_review:held,
  decisions:counts,reasons,per_source:perSource,repair_priorities:Object.values(repair).sort((a,b)=>b.affected-a.affected||a.source.localeCompare(b.source)||a.cause.localeCompare(b.cause)),
  publishable_count:0,certified_active_count:0,database_access:0,database_writes:0,production_published:0};
 return {summary,inspected,passed:inspected.filter(x=>x.tamis.decision==='candidate_snapshot_pass'),
  quarantine:inspected.filter(x=>x.tamis.decision!=='candidate_snapshot_pass')};
}
