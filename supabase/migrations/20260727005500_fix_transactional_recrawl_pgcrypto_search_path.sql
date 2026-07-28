-- P0 DATA — Resolve pgcrypto functions from the Supabase extensions schema.

alter function public.commit_transactional_recrawl_observation_v1(
  text,bigint,text,text,uuid,timestamptz,timestamptz,integer,timestamptz,numeric,text,numeric,text,text,text,text,text,uuid,text,jsonb
) set search_path = public, extensions, pg_temp;

comment on function public.commit_transactional_recrawl_observation_v1(
  text,bigint,text,text,uuid,timestamptz,timestamptz,integer,timestamptz,numeric,text,numeric,text,text,text,text,text,uuid,text,jsonb
) is 'Atomic internal recrawl commit with explicit pgcrypto schema resolution. No publication.';
