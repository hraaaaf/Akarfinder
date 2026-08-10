#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const forward = readFileSync(join(process.cwd(),'supabase/migration-designs/p1b13b_oasis_registry_write.sql'),'utf8');
const rollback = readFileSync(join(process.cwd(),'supabase/migration-designs/p1b13b_oasis_registry_rollback.sql'),'utf8');

function assert(v: unknown, m: string): asserts v { if (!v) throw new Error(m); }

async function schema(db: PGlite) {
  await db.exec(`
    create table geo_entities (
      id text primary key, entity_type text not null, parent_id text null references geo_entities(id) on delete restrict,
      slug text not null, canonical_name text not null, normalized_name text not null,
      validation_status text not null, seo_eligible boolean not null, map_eligible boolean not null,
      source_version text not null, metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      unique(entity_type,parent_id,slug)
    );
    create table geo_aliases (
      id uuid primary key default gen_random_uuid(), geo_entity_id text not null references geo_entities(id) on delete cascade,
      alias text not null, normalized_alias text not null, locale text null, source text not null, confidence numeric not null,
      created_at timestamptz not null default now()
    );
    create table geo_resolution_events (
      id uuid primary key default gen_random_uuid(), resolved_neighborhood_id text null references geo_entities(id),
      created_at timestamptz not null default now()
    );
    insert into geo_entities(id,entity_type,parent_id,slug,canonical_name,normalized_name,validation_status,seo_eligible,map_eligible,source_version,metadata)
    values ('city_casablanca','city',null,'casablanca','Casablanca','casablanca','validated',true,false,'registry_v1','{}');
  `);
}

async function count(db: PGlite, table: string, where: string) {
  const r = await db.query<{n:number}>(`select count(*)::int as n from ${table} where ${where}`);
  return r.rows[0]?.n ?? 0;
}

async function run() {
  const db = new PGlite();
  await schema(db);
  await db.exec(forward);
  assert(await count(db,'geo_entities',`id='district_casablanca_oasis'`)===1,'forward must create exactly one Oasis entity');
  assert(await count(db,'geo_aliases',`geo_entity_id='district_casablanca_oasis' and normalized_alias='oasis'`)===1,'forward must create exact Oasis alias');
  const entity = await db.query<any>(`select * from geo_entities where id='district_casablanca_oasis'`);
  assert(entity.rows[0]?.parent_id==='city_casablanca','wrong Oasis parent');
  assert(entity.rows[0]?.map_eligible===false && entity.rows[0]?.seo_eligible===false,'Oasis must remain map/SEO OFF');

  let secondForwardFailed = false;
  try { await db.exec(forward); } catch { secondForwardFailed = true; }
  assert(secondForwardFailed,'second forward must fail closed');

  await db.exec('rollback'); // clear aborted transaction state if driver opened one
  await db.exec(rollback);
  assert(await count(db,'geo_entities',`id='district_casablanca_oasis'`)===0,'rollback must remove Oasis entity');
  assert(await count(db,'geo_aliases',`geo_entity_id='district_casablanca_oasis'`)===0,'rollback must remove Oasis alias');

  await db.exec(forward);
  await db.exec(`insert into geo_resolution_events(resolved_neighborhood_id) values ('district_casablanca_oasis')`);
  let guardedRollbackFailed = false;
  try { await db.exec(rollback); } catch { guardedRollbackFailed = true; }
  assert(guardedRollbackFailed,'rollback must fail when a resolution event references Oasis');
  await db.exec('rollback');
  assert(await count(db,'geo_entities',`id='district_casablanca_oasis'`)===1,'guarded rollback must preserve Oasis entity');

  console.log(JSON.stringify({verdict:'P1B13B_OASIS_REGISTRY_WRITE_DESIGN_REHEARSAL_PASS', forward:true, rollback:true, guarded_rollback:true, map:false, seo:false},null,2));
}

run().catch(e=>{console.error(e);process.exitCode=1});
