alter function public.search_public_representations_v1(
  text, text, text, text,
  numeric, numeric, numeric, numeric,
  integer, smallint, real, timestamptz, uuid
) set plan_cache_mode = 'force_custom_plan';
