import fs from 'node:fs/promises';
import path from 'node:path';
const OUT=process.env.EXTERNAL_POLICY_OUT||'.tmp/external-reservoir-policy-probe';
const targets=['properstar.com','ma.green-acres.com','green-acres.com','holprop.com','ma.opensooq.com','opensooq.com','jamesedition.com','luxuryestate.com','fazwaz.fr','properstar.fr'];
function env(n){const v=process.env[n];if(!v)throw new Error(`missing ${n}`);return v;}
async function get(table,params){const u=new URL(`/rest/v1/${table}`,env('SUPABASE_URL'));for(const[k,v]of Object.entries(params))u.searchParams.set(k,v);const key=env('SUPABASE_SERVICE_ROLE_KEY');const r=await fetch(u,{headers:{apikey:key,authorization:`Bearer ${key}`},signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`${table} ${r.status} ${await r.text()}`);return r.json();}
const rows=await get('source_policy_registry',{select:'source_domain,authorization_status,display_policy,display_gate,acquisition_mode,ingestion_gate,notes',source_domain:`in.(${targets.join(',')})`});
const by=new Map(rows.map(x=>[String(x.source_domain).toLowerCase(),x]));
const summary={generatedAt:new Date().toISOString(),readOnly:true,databaseWrites:0,sourceNetworkRequests:0,targets:targets.map(sourceDomain=>({sourceDomain,registryRow:by.get(sourceDomain)||null}))};
await fs.mkdir(OUT,{recursive:true});await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
