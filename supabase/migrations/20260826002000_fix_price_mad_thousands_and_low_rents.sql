-- SEED-TO-LISTING conversion recovery
-- Fixes two verified odm03_extract_price_mad defects:
-- 1. one-digit leading thousand groups such as `4 850 000 DH` were parsed as `850 000`;
-- 2. explicit rental prices below 10 000 MAD were discarded.
-- Keep the upper bound aligned with the national writer's 30M MAD safety ceiling.

create or replace function public.odm03_extract_price_mad(p_text text)
returns numeric
language sql
immutable strict
set search_path to ''
as $function$
  with m as (
    select (regexp_match(lower(p_text), '(?:^|[^0-9])([0-9]{1,7}(?:[ .,][0-9]{3})*)\s*(?:dh|dhs|mad)(?:[^a-z]|$)', 'i'))[1] as raw
  ), v as (
    select case when raw is null then null else regexp_replace(raw, '[^0-9]', '', 'g')::numeric end as n from m
  )
  select case when n between 1 and 30000000 then n else null end from v;
$function$;
