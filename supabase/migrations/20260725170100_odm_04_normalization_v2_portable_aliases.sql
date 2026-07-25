-- ODM-04 portability hardening: no dependency on an unaccent extension schema.

create or replace function public.odm04_fold_text(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(translate(btrim(p_value),
    'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖòóôõöÙÚÛÜùúûüÝŸýÿ',
    'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOoooooUUUUuuuuYYyy'));
$$;

create or replace function public.odm04_normalize_city(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case public.odm04_fold_text(p_value)
    when 'casablanca' then 'Casablanca'
    when 'casa' then 'Casablanca'
    when 'rabat' then 'Rabat'
    when 'marrakech' then 'Marrakech'
    when 'tanger' then 'Tanger'
    when 'tangier' then 'Tanger'
    when 'agadir' then 'Agadir'
    when 'fes' then 'Fès'
    when 'meknes' then 'Meknès'
    when 'kenitra' then 'Kénitra'
    when 'temara' then 'Témara'
    when 'sale' then 'Salé'
    when 'tetouan' then 'Tétouan'
    when 'oujda' then 'Oujda'
    when 'el jadida' then 'El Jadida'
    when 'jadida' then 'El Jadida'
    when 'mohammedia' then 'Mohammedia'
    when 'nador' then 'Nador'
    when 'essaouira' then 'Essaouira'
    when 'safi' then 'Safi'
    when 'settat' then 'Settat'
    when 'berrechid' then 'Berrechid'
    when 'khouribga' then 'Khouribga'
    when 'dakhla' then 'Dakhla'
    when 'laayoune' then 'Laâyoune'
    when 'beni mellal' then 'Béni Mellal'
    else null
  end;
$$;

create or replace function public.odm04_normalize_property_type(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case public.odm04_fold_text(p_value)
    when 'appartement' then 'apartment'
    when 'apartment' then 'apartment'
    when 'flat' then 'apartment'
    when 'villa' then 'villa'
    when 'maison' then 'house'
    when 'house' then 'house'
    when 'studio' then 'studio'
    when 'terrain' then 'land'
    when 'land' then 'land'
    when 'plot' then 'land'
    when 'bureau' then 'office'
    when 'office' then 'office'
    when 'local commercial' then 'commercial'
    when 'commercial' then 'commercial'
    when 'commerce' then 'commercial'
    when 'shop' then 'commercial'
    when 'riad' then 'riad'
    when 'ferme' then 'farm'
    when 'farm' then 'farm'
    else null
  end;
$$;

create or replace function public.odm04_normalize_intent(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case public.odm04_fold_text(p_value)
    when 'sale' then 'sale'
    when 'sell' then 'sale'
    when 'vente' then 'sale'
    when 'vendre' then 'sale'
    when 'buy' then 'sale'
    when 'acheter' then 'sale'
    when 'rent' then 'rent'
    when 'rental' then 'rent'
    when 'lease' then 'rent'
    when 'location' then 'rent'
    when 'louer' then 'rent'
    when 'new' then 'new'
    when 'neuf' then 'new'
    when 'programme' then 'new'
    when 'project' then 'new'
    else null
  end;
$$;

revoke all on function public.odm04_fold_text(text) from public, anon, authenticated;
