#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { join } from 'node:path';
import { loadEnvFile } from '@/lib/openserp-ingestion/env';

loadEnvFile(join(process.cwd(), '.env.local'));
loadEnvFile(join(process.cwd(), '.env.mission'));

type Segment = 'vefa'|'new_delivered'|'recent'|'renovated_old'|'good_condition'|'needs_refresh'|'needs_renovation'|'old_unspecified'|'unknown';
type Listing = { id:number; title:string|null; description_snippet:string|null; condition:string|null; property_age_range:string|null };

const rules: Array<{segment:Segment; confidence:number; patterns:RegExp[]}> = [
  { segment:'vefa', confidence:.85, patterns:[/\bvefa\b/i,/vente en l.?etat futur/i,/en cours de construction/i,/livraison\s+20\d{2}/i] },
  { segment:'new_delivered', confidence:.85, patterns:[/jamais habite/i,/jamais habité/i,/neuf livre/i,/neuf livré/i,/premiere main/i,/première main/i,/nouvelle construction/i] },
  { segment:'recent', confidence:.70, patterns:[/\brecent\b/i,/\brécent\b/i,/construction recente/i,/construction récente/i] },
  { segment:'renovated_old', confidence:.85, patterns:[/entierement renove/i,/entièrement rénové/i,/refait a neuf/i,/refait à neuf/i,/renove avec gout/i,/rénové avec goût/i] },
  { segment:'good_condition', confidence:.70, patterns:[/bon etat/i,/bon état/i,/tres bon etat/i,/très bon état/i,/excellent etat/i,/excellent état/i] },
  { segment:'needs_refresh', confidence:.85, patterns:[/a rafraichir/i,/à rafraîchir/i,/rafraichissement/i,/rafraîchissement/i] },
  { segment:'needs_renovation', confidence:.85, patterns:[/a renover/i,/à rénover/i,/travaux a prevoir/i,/travaux à prévoir/i,/gros travaux/i] },
  { segment:'old_unspecified', confidence:.70, patterns:[/\bancien\b/i,/ancienne construction/i] },
];

function classify(row: Listing): {segment:Segment; confidence:number; evidence:Record<string,unknown>} {
  const text = [row.title,row.description_snippet,row.condition,row.property_age_range].filter(Boolean).join(' ');
  if (row.condition?.trim()) {
    const hit = rules.find(r => r.patterns.some(p => p.test(row.condition!)));
    if (hit) return { segment:hit.segment, confidence:.95, evidence:{source:'structured_condition',raw_condition:row.condition} };
  }
  if (row.property_age_range?.trim()) {
    if (['1-5 ans','5-10 ans'].includes(row.property_age_range)) return {segment:'recent',confidence:.90,evidence:{source:'structured_age',raw_age:row.property_age_range}};
    if (['10-20 ans','20-30 ans','30+ ans'].includes(row.property_age_range)) return {segment:'old_unspecified',confidence:.90,evidence:{source:'structured_age',raw_age:row.property_age_range}};
  }
  const hit = rules.find(r => r.patterns.some(p => p.test(text)));
  return hit ? {segment:hit.segment,confidence:hit.confidence,evidence:{source:'explicit_listing_text'}} : {segment:'unknown',confidence:.10,evidence:{source:'no_explicit_signal'}};
}

async function main() {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('property_listings').select('id,title,description_snippet,condition,property_age_range');
  if(error) throw error;
  const snapshot=`property_listings_${new Date().toISOString().slice(0,10)}`;
  const rows=(data as Listing[]).map(row=>{const c=classify(row);return {listing_id:row.id,condition_segment:c.segment,confidence:c.confidence,evidence:c.evidence,methodology_version:'property_condition_rules_v1',input_snapshot_id:snapshot};});
  const {error:upsertError}=await db.from('property_condition_observations').upsert(rows,{onConflict:'listing_id,methodology_version,input_snapshot_id'});
  if(upsertError) throw upsertError;
  const counts=rows.reduce<Record<string,number>>((a,r)=>(a[r.condition_segment]=(a[r.condition_segment]??0)+1,a),{});
  console.log(JSON.stringify({status:'ok',snapshot,total:rows.length,counts},null,2));
}
main().catch(e=>{console.error('[p0-data-classify-property-condition]',e);process.exit(1);});