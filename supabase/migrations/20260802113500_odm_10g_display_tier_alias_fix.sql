-- Correct the Display Policy V2 column alias used by ODM-10G compatibility.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.odm_10g_apply_discovery_coverage_v2(text)'::regprocedure)
  into v_definition;
  v_definition := replace(v_definition, "display_decision='blocked'", "display_tier_v2='blocked'");
  execute v_definition;
end;
$$;

comment on function public.odm_10g_apply_discovery_coverage_v2(text) is
'Ranking V2-compatible ODM-10G enrichment using Display Policy V2 display_tier_v2. Row quality signals may recompute; formula and public activation remain unchanged.';