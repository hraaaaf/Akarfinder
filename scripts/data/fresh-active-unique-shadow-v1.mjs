import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
function parseDate(s){if(typeof s!=='string'||!/^\d{4}-\d\d-\d\d$/.test(s))return null;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?d:null;}
function recent(s,now,days){const a=parseDate(s),b=parseDate(now);return !!(a&&b&&b>=a&&b-a<=days*86400000);}
const ref=s=>typeof s==='string'&&s.trim().length>=8;
export function evaluateListing(row,e={},now='2026-10-10'){
 const c=!!(row?.five_field_observed_consistent&&Array.isArray(row.cross_run_conflicts)&&!row.cross_run_conflicts.length);
 const d=e.detail||{},a=e.availability||{},p=e.physical||{},r=e.rights||{};
 const published=c&&d.identity===row.identity&&d.primary_verified===true&&d.price_matches===true&&d.surface_matches===true&&ref(d.date_ref)&&recent(d.published_at,now,30);
 const active=published&&a.identity===row.identity&&a.status==='available'&&['owner','mandated_agent'].includes(a.issuer_role)&&a.issuer_verified===true&&ref(a.evidence_ref)&&recent(a.confirmed_at,now,7);
 const unique=c&&p.identity===row.identity&&p.unique_reviewed===true&&p.human_reviewed===true&&ref(p.comparison_ref)&&ref(p.decision_ref)&&recent(p.reviewed_at,now,30);
 const rights=c&&r.identity===row.identity&&r.authorized===true&&r.rightsholder_verified===true&&ref(r.permission_ref);
 const checks={complete_card:c,recent_publication:!!published,seller_confirmed_active:!!active,physical_unique_reviewed:!!unique,reuse_rights_approved:!!rights};
 return {source:row?.source,identity:row?.identity,checks,ready_for_publication:Object.values(checks).every(Boolean),blockers:Object.keys(checks).filter(k=>!checks[k])};
}
const hash=s=>createHash('sha256').update(s).digest('hex');
export function sampleCandidates(rows,perSource=30){
 const result=[];
 for(const source of ['mubawab.ma','domio.ma']){
  const candidates=rows.filter(r=>r.source===source&&r.five_field_observed_consistent===true&&!r.cross_run_conflicts?.length);
  const sortDeterministic=(a,b)=>hash(source+'|'+a.identity).localeCompare(hash(source+'|'+b.identity));
  const suspects=candidates.filter(r=>r.potential_same_property_other_id===true).sort(sortDeterministic);
  const controls=candidates.filter(r=>r.potential_same_property_other_id!==true).sort(sortDeterministic);
  const riskQuota=Math.min(10,Math.floor(perSource/3));
  const chosen=[...suspects.slice(0,riskQuota),...controls.slice(0,perSource-riskQuota)];
  if(chosen.length<perSource){
   const included=new Set(chosen.map(r=>r.identity));
   chosen.push(...[...controls,...suspects].filter(r=>!included.has(r.identity)).slice(0,perSource-chosen.length));
  }
  result.push(...chosen.map(r=>({source:r.source,identity:r.identity,canonical_url:r.canonical_url,city:r.city,district:r.district,
   suspected_duplicate:r.potential_same_property_other_id===true,
   sampling_stratum:r.potential_same_property_other_id===true?'risk_enriched':'baseline_control',
   status:'unverified_evidence_required'})));
 }
 return result;
}
export function shadowReport(rows,{now='2026-10-10',proofs={},perSource=30}={}){
 if(!parseDate(now))throw Error('invalid as-of date');
 const result=rows.map(r=>evaluateListing(r,proofs[r.source+'|'+r.identity]||{},now));
 const count=k=>result.filter(x=>x.checks[k]).length;
 const sample=sampleCandidates(rows,perSource);
 return {report:{schema_version:'AKARFINDER_ACTIVE_UNIQUE_SHADOW_V1',as_of:now,source_ids:rows.length,five_field_cards:count('complete_card'),recent_published_count:count('recent_publication'),confirmed_active_count:count('seller_confirmed_active'),physically_unique_reviewed_count:count('physical_unique_reviewed'),rights_approved_count:count('reuse_rights_approved'),publishable_count:result.filter(x=>x.ready_for_publication).length,sample_count:sample.length,
  risk_enriched_sample_count:sample.filter(x=>x.sampling_stratum==='risk_enriched').length,
  baseline_control_sample_count:sample.filter(x=>x.sampling_stratum==='baseline_control').length,
  by_source:Object.fromEntries(['mubawab.ma','domio.ma'].map(s=>[s,sample.filter(x=>x.source===s).length])),database_access:0,database_writes:0,production_published:0,note:'Risk-enriched and control strata must be evaluated separately; unweighted sample cannot estimate population activity. HTTP200 or publication date cannot certify commercial availability, physical uniqueness or rights.'},sample};
}
async function main(){if(!process.env.LEDGER_INPUT)throw Error('LEDGER_INPUT required');const rows=(await fs.readFile(process.env.LEDGER_INPUT,'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);const {report,sample}=shadowReport(rows);await fs.writeFile('active-unique-shadow-v1.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile('active-unique-shadow-v1.jsonl',sample.map(JSON.stringify).join('\n')+'\n');console.log(JSON.stringify(report,null,2));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e);process.exitCode=1;});
