-- MASS-INDEX M5-B — public freshness gate.
-- Preserve discovery/index reservoirs, but require fresh confirmation for every
-- public Thin Index serving path. This migration changes function predicates
-- only; it does not delete or mutate source_offer_seeds / Thin Index rows.

do $m5$
declare
  v_oid oid;
  v_def text;
  v_old_public constant text := 'd.freshness_status in (''seed_only'', ''fresh_confirmed'')';
  v_old_thin constant text := 'd.freshness_status in (''seed_only'',''fresh_confirmed'')';
  v_new constant text := 'd.freshness_status = ''fresh_confirmed''';
begin
  v_oid := to_regprocedure('public.search_public_representations_v2(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamp with time zone,uuid)');
  if v_oid is null then
    raise exception 'M5_PUBLIC_FRESHNESS_FUNCTION_MISSING: search_public_representations_v2';
  end if;

  v_def := pg_get_functiondef(v_oid);
  if position(v_old_public in v_def) = 0 then
    raise exception 'M5_PUBLIC_FRESHNESS_EXPECTED_PREDICATE_MISSING: search_public_representations_v2';
  end if;
  execute replace(v_def, v_old_public, v_new);

  v_oid := to_regprocedure('public.search_thin_index_v3(text,text,text,text,integer,real,timestamp with time zone,uuid)');
  if v_oid is null then
    raise exception 'M5_PUBLIC_FRESHNESS_FUNCTION_MISSING: search_thin_index_v3';
  end if;

  v_def := pg_get_functiondef(v_oid);
  if position(v_old_thin in v_def) = 0 then
    raise exception 'M5_PUBLIC_FRESHNESS_EXPECTED_PREDICATE_MISSING: search_thin_index_v3';
  end if;
  execute replace(v_def, v_old_thin, v_new);

  if position(v_new in pg_get_functiondef(
       'public.search_public_representations_v2(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamp with time zone,uuid)'::regprocedure
     )) = 0
     or position(v_old_public in pg_get_functiondef(
       'public.search_public_representations_v2(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamp with time zone,uuid)'::regprocedure
     )) > 0 then
    raise exception 'M5_PUBLIC_FRESHNESS_POSTCONDITION_FAILED: search_public_representations_v2';
  end if;

  if position(v_new in pg_get_functiondef(
       'public.search_thin_index_v3(text,text,text,text,integer,real,timestamp with time zone,uuid)'::regprocedure
     )) = 0
     or position(v_old_thin in pg_get_functiondef(
       'public.search_thin_index_v3(text,text,text,text,integer,real,timestamp with time zone,uuid)'::regprocedure
     )) > 0 then
    raise exception 'M5_PUBLIC_FRESHNESS_POSTCONDITION_FAILED: search_thin_index_v3';
  end if;
end
$m5$;

comment on function public.search_public_representations_v2(text,text,text,text,numeric,numeric,numeric,numeric,integer,smallint,real,timestamp with time zone,uuid)
  is 'MASS-INDEX M5-B: public representations require fresh_confirmed Thin Index rows.';
comment on function public.search_thin_index_v3(text,text,text,text,integer,real,timestamp with time zone,uuid)
  is 'MASS-INDEX M5-B: legacy Thin Index fallback requires fresh_confirmed rows.';
