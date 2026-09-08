-- Mubawab district recovery staging
-- Dry-run only. No writes are executed by this file.
-- Goal: accumulate deterministic candidate tiers, then perform one reviewed DB push.
-- Invariants: city-scoped, exact textual evidence only, no fuzzy matching, no overwrite,
-- ambiguous candidates excluded, city-as-district excluded, generic labels excluded.

WITH resolved AS (
  SELECT
    lower(city) AS city,
    lower(replace(replace(replace(coalesce(district,''),'%c3%a9','e'),'%c3%a8','e'),'%c3%a0','a')) AS district,
    count(*) AS support
  FROM public.minimal_live_search_documents_v1
  WHERE source_domain='mubawab.ma'
    AND nullif(btrim(district),'') IS NOT NULL
  GROUP BY 1,2
),
base AS (
  SELECT *
  FROM public.minimal_live_search_documents_v1
  WHERE source_domain='mubawab.ma'
    AND nullif(btrim(district),'') IS NULL
),
filtered_dictionary AS (
  SELECT *
  FROM resolved
  WHERE length(district) >= 5
    AND district NOT IN (
      'centre','medina','ancienne medina','nouvelle ville','ville nouvelle','route','quartier',
      'casablanca','rabat','marrakech','agadir','tanger','fes','kenitra','temara','sale',
      'mohammedia','dar bouazza','asilah','errahma','harhoura','had soualem'
    )
),
raw_matches AS (
  SELECT
    b.id,
    b.canonical_url,
    b.city,
    d.district,
    d.support,
    CASE
      WHEN d.support >= 25 THEN 'SAFE_25'
      WHEN d.support >= 10 THEN 'SAFE_10'
      WHEN d.support >= 5  THEN 'SAFE_5'
      ELSE 'LOW_SUPPORT'
    END AS recovery_tier,
    count(*) OVER (PARTITION BY b.id) AS candidate_count
  FROM base b
  JOIN filtered_dictionary d
    ON d.city=lower(b.city)
   AND lower(b.canonical_url) ~ ('(^|[-_/])' || replace(d.district,' ','[-_%]?') || '([-_/]|$)')
),
accepted AS (
  SELECT *
  FROM raw_matches
  WHERE candidate_count=1
    AND recovery_tier IN ('SAFE_25','SAFE_10','SAFE_5')
),
rejected_ambiguous AS (
  SELECT *
  FROM raw_matches
  WHERE candidate_count>1
)
SELECT recovery_tier,
       count(*) AS candidate_rows,
       min(support) AS min_support,
       max(support) AS max_support
FROM accepted
GROUP BY recovery_tier
UNION ALL
SELECT 'AMBIGUOUS_REJECTED', count(*), null, null
FROM rejected_ambiguous
ORDER BY 1;

-- Final reviewed write template (INTENTIONALLY COMMENTED OUT):
-- UPDATE public.minimal_live_search_documents_v1 l
-- SET district = a.district,
--     district_provenance = 'mubawab_self_learned_exact_city_slug_v1'
-- FROM accepted a
-- WHERE l.id=a.id
--   AND nullif(btrim(l.district),'') IS NULL;
