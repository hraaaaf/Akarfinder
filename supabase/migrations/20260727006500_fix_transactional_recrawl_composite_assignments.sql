-- P0 DATA — Correct PL/pgSQL assignment of composite-returning helper functions.
-- The helper functions return table row types, so direct row assignment is required.

do $$
declare
  v_signature regprocedure := 'public.commit_transactional_recrawl_observation_v1(text,bigint,text,text,uuid,timestamptz,timestamptz,integer,timestamptz,numeric,text,numeric,text,text,text,text,text,uuid,text,jsonb)'::regprocedure;
  v_definition text;
begin
  select pg_get_functiondef(v_signature) into v_definition;

  if position('select public.persist_observation_ledger_event(' in v_definition) = 0
     or position('select public.record_recrawl_attempt(' in v_definition) = 0 then
    raise exception 'transactional recrawl function shape is unexpected';
  end if;

  v_definition := replace(
    v_definition,
    'select public.persist_observation_ledger_event(',
    'v_event := public.persist_observation_ledger_event('
  );
  v_definition := replace(v_definition, ') into v_event;', ');');
  v_definition := replace(
    v_definition,
    'select public.record_recrawl_attempt(',
    'v_attempt := public.record_recrawl_attempt('
  );
  v_definition := replace(v_definition, ') into v_attempt;', ');');

  execute v_definition;
end;
$$;

comment on function public.commit_transactional_recrawl_observation_v1(
  text,bigint,text,text,uuid,timestamptz,timestamptz,integer,timestamptz,numeric,text,numeric,text,text,text,text,text,uuid,text,jsonb
) is 'Atomic internal recrawl commit with correct composite row assignments. No publication.';
