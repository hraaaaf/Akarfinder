-- COMMONCRAWL-RECENT-CONFIRMATION-V1.2
-- Extend deterministic URL-only city recovery for three unambiguous Moroccan locations.
-- No freshness rule, policy gate, URL admission pattern, source content, or serving rule is widened.
-- M'diq-Fnideq is deliberately excluded because the URL token denotes a broader prefecture/zone.

create or replace function public.odm03_recover_city(p_text text)
returns text
language sql
immutable strict
set search_path to ''
as $function$
  select case
    when lower(p_text) ~ '(^|[^a-z])dar[ -]?bouazza([^a-z]|$)' then 'Dar Bouazza'
    when lower(p_text) ~ '(^|[^a-z])benslimane([^a-z]|$)' then 'Benslimane'
    when lower(p_text) ~ '(^|[^a-z])bouznika([^a-z]|$)' then 'Bouznika'
    when lower(p_text) ~ '(^|[^a-z])casablanca([^a-z]|$)' then 'Casablanca'
    when lower(p_text) ~ '(^|[^a-z])rabat([^a-z]|$)' then 'Rabat'
    when lower(p_text) ~ '(^|[^a-z])marrakech([^a-z]|$)' then 'Marrakech'
    when lower(p_text) ~ '(^|[^a-z])(tanger|tangier)([^a-z]|$)' then 'Tanger'
    when lower(p_text) ~ '(^|[^a-z])agadir([^a-z]|$)' then 'Agadir'
    when lower(p_text) ~ '(^|[^a-z])(fes|fès)([^a-z]|$)' then 'Fès'
    when lower(p_text) ~ '(^|[^a-z])meknes([^a-z]|$)' then 'Meknès'
    when lower(p_text) ~ '(^|[^a-z])kenitra([^a-z]|$)' then 'Kénitra'
    when lower(p_text) ~ '(^|[^a-z])temara([^a-z]|$)' then 'Témara'
    when lower(p_text) ~ '(^|[^a-z])sale([^a-z]|$)' then 'Salé'
    when lower(p_text) ~ '(^|[^a-z])tetouan([^a-z]|$)' then 'Tétouan'
    when lower(p_text) ~ '(^|[^a-z])oujda([^a-z]|$)' then 'Oujda'
    when lower(p_text) ~ '(^|[^a-z])(el[ -]?jadida|jadida)([^a-z]|$)' then 'El Jadida'
    when lower(p_text) ~ '(^|[^a-z])mohammedia([^a-z]|$)' then 'Mohammedia'
    when lower(p_text) ~ '(^|[^a-z])nador([^a-z]|$)' then 'Nador'
    when lower(p_text) ~ '(^|[^a-z])essaouira([^a-z]|$)' then 'Essaouira'
    when lower(p_text) ~ '(^|[^a-z])safi([^a-z]|$)' then 'Safi'
    when lower(p_text) ~ '(^|[^a-z])settat([^a-z]|$)' then 'Settat'
    when lower(p_text) ~ '(^|[^a-z])berrechid([^a-z]|$)' then 'Berrechid'
    when lower(p_text) ~ '(^|[^a-z])khouribga([^a-z]|$)' then 'Khouribga'
    when lower(p_text) ~ '(^|[^a-z])dakhla([^a-z]|$)' then 'Dakhla'
    when lower(p_text) ~ '(^|[^a-z])laayoune([^a-z]|$)' then 'Laâyoune'
    else null end;
$function$;

create or replace function public.odm04_normalize_city(p_value text)
returns text
language sql
immutable strict
set search_path to ''
as $function$
  select case public.odm04_fold_text(p_value)
    when 'dar bouazza' then 'Dar Bouazza' when 'dar-bouazza' then 'Dar Bouazza'
    when 'benslimane' then 'Benslimane' when 'bouznika' then 'Bouznika'
    when 'casablanca' then 'Casablanca' when 'casa' then 'Casablanca' when 'rabat' then 'Rabat'
    when 'marrakech' then 'Marrakech' when 'tanger' then 'Tanger' when 'tangier' then 'Tanger'
    when 'agadir' then 'Agadir' when 'fes' then 'Fès' when 'meknes' then 'Meknès'
    when 'kenitra' then 'Kénitra' when 'temara' then 'Témara' when 'sale' then 'Salé'
    when 'tetouan' then 'Tétouan' when 'oujda' then 'Oujda' when 'el jadida' then 'El Jadida'
    when 'jadida' then 'El Jadida' when 'mohammedia' then 'Mohammedia' when 'nador' then 'Nador'
    when 'essaouira' then 'Essaouira' when 'safi' then 'Safi' when 'settat' then 'Settat'
    when 'berrechid' then 'Berrechid' when 'khouribga' then 'Khouribga' when 'dakhla' then 'Dakhla'
    when 'laayoune' then 'Laâyoune' when 'beni mellal' then 'Béni Mellal' else null end;
$function$;

comment on function public.odm03_recover_city(text) is
  'URL/text city recovery; V1.2 adds Dar Bouazza, Benslimane and Bouznika for unambiguous Common Crawl detail URLs.';
comment on function public.odm04_normalize_city(text) is
  'Canonical city normalization; V1.2 adds Dar Bouazza, Benslimane and Bouznika.';
