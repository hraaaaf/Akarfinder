// OPENSERP-SERVERLESS-STATE-PROD-MIGRATION-1 -- assembles the exact
// single-paste SQL script for the Supabase SQL Editor: both frozen
// migrations + the frozen seed, wrapped in one outer transaction with a
// verification block that RAISEs (auto-rollback) if the result doesn't
// match the frozen expectations exactly. One paste, one Run, avoids the
// pooled-connection BEGIN/COMMIT-split gotcha already learned earlier in
// this engagement.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MIG1 = readFileSync(join(process.cwd(), "supabase/migrations/20260718140000_create_openserp_query_rotation_state.sql"), "utf8");
const MIG2 = readFileSync(join(process.cwd(), "supabase/migrations/20260718140100_create_openserp_engine_budget_state.sql"), "utf8");
let seed = readFileSync(join(process.cwd(), "data/audits/openserp-serverless-state-seed.sql"), "utf8");
// Strip the seed file's OWN begin;/commit; (anywhere as a standalone line,
// not just at string-start) since this whole file becomes one statement
// inside the single outer transaction below -- a redundant nested BEGIN
// would otherwise just warn-and-continue in Postgres rather than error,
// but it's cleaner to remove it outright.
seed = seed.replace(/^begin;[ \t]*\r?\n/m, "").replace(/\r?\n[ \t]*commit;[ \t]*\r?\n?$/, "\n");

const script = `-- OPENSERP-SERVERLESS-STATE-PROD-MIGRATION-1
-- Single-paste Production application: both frozen migrations + the frozen
-- seed, one transaction. Additive only -- no DROP/TRUNCATE/DELETE, no
-- listing table touched. Auto-rolls-back on any verification mismatch.

begin;

${MIG1}
${MIG2}
-- seed (begin/commit stripped -- part of this single outer transaction)
${seed}

-- verification block: raises (aborting the whole transaction) on any
-- mismatch versus the frozen expectations.
do $$
declare
  rotation_count integer;
  budget_count integer;
  distinct_query_ids integer;
  distinct_engines integer;
  policy_count integer;
begin
  select count(*) into rotation_count from openserp_query_rotation_state;
  if rotation_count <> 2718 then
    raise exception 'VERIFICATION FAILED: expected 2718 rotation rows, got %', rotation_count;
  end if;

  select count(*) into budget_count from openserp_engine_budget_state;
  if budget_count <> 3 then
    raise exception 'VERIFICATION FAILED: expected 3 budget rows, got %', budget_count;
  end if;

  select count(distinct query_id) into distinct_query_ids from openserp_query_rotation_state;
  if distinct_query_ids <> 2718 then
    raise exception 'VERIFICATION FAILED: expected 2718 distinct query_id, got %', distinct_query_ids;
  end if;

  select count(distinct engine) into distinct_engines from openserp_engine_budget_state;
  if distinct_engines <> 3 then
    raise exception 'VERIFICATION FAILED: expected 3 distinct engines, got %', distinct_engines;
  end if;

  select count(*) into policy_count from pg_policies where tablename in ('openserp_query_rotation_state', 'openserp_engine_budget_state');
  if policy_count <> 0 then
    raise exception 'VERIFICATION FAILED: expected 0 policies on the two new tables, got %', policy_count;
  end if;

  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'openserp_query_rotation_state' and c.relrowsecurity) then
    raise exception 'VERIFICATION FAILED: RLS not enabled on openserp_query_rotation_state';
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'openserp_engine_budget_state' and c.relrowsecurity) then
    raise exception 'VERIFICATION FAILED: RLS not enabled on openserp_engine_budget_state';
  end if;

  raise notice 'VERIFICATION PASSED: % rotation rows, % budget rows, RLS enabled on both, 0 policies', rotation_count, budget_count;
end $$;

commit;
`;

const outPath = join(process.cwd(), "data/audits/openserp-serverless-state-prod-migration-manifest.sql");
writeFileSync(outPath, script, "utf8");
console.log(`Wrote ${outPath} (${script.split("\n").length} lines)`);
