\set ON_ERROR_STOP on
\if :{?apply_limit}
\else
  \set apply_limit 0
\endif

BEGIN;

DO $ BEGIN IF current_database() <> 'AkarFinder' THEN RAISE EXCEPTION 'Unexpected database: %', current_database(); END IF; END $;

CREATE TEMP TABLE ff_stage_all (
  url text PRIMARY KEY,
  title text,
  description_snippet text,
  transaction_type text,
  property_type text,
  city text,
  district text,
  surface_m2 bigint,
  rooms_count integer,
  bedrooms_count integer,
  bathrooms_count integer
);
\copy ff_stage_all FROM '/work/artifacts/neon-full-field-write/full-field-write-stage.csv' WITH (FORMAT csv, HEADER true);

CREATE TEMP TABLE ff_stage AS
SELECT *
FROM ff_stage_all
ORDER BY md5(url)
LIMIT (CASE WHEN :apply_limit::int>0 THEN :apply_limit::int ELSE NULL END);

CREATE TEMP TABLE ff_match AS
SELECT
  s.url,
  count(DISTINCT pl.id)::int AS match_count,
  min(pl.id)::bigint AS property_listing_id
FROM ff_stage s
LEFT JOIN listing_sources ls
  ON ls.listing_url=s.url
 AND ls.is_active IS TRUE
LEFT JOIN property_listings pl
  ON pl.id=ls.property_listing_id
GROUP BY s.url;

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM ff_match WHERE match_count<>1;
  IF bad<>0 THEN RAISE EXCEPTION 'Expected exactly one active property per staged URL; bad URLs=%',bad; END IF;
END $$;

CREATE TEMP TABLE ff_before AS
SELECT
  s.*,
  m.property_listing_id,
  pl.title AS old_title,
  pl.description_snippet AS old_description_snippet,
  pl.transaction_type AS old_transaction_type,
  pl.property_type AS old_property_type,
  pl.city AS old_city,
  pl.district AS old_district,
  pl.surface_m2 AS old_surface_m2,
  pl.rooms_count AS old_rooms_count,
  pl.bedrooms_count AS old_bedrooms_count,
  pl.bathrooms_count AS old_bathrooms_count
FROM ff_stage s
JOIN ff_match m USING(url)
JOIN property_listings pl ON pl.id=m.property_listing_id;

CREATE TEMP TABLE ff_conflicts AS
SELECT url,'title'::text field,old_title::text current_value,title::text candidate_value FROM ff_before
WHERE title IS NOT NULL AND old_title IS NOT NULL AND old_title IS DISTINCT FROM title
UNION ALL SELECT url,'description_snippet',old_description_snippet::text,description_snippet::text FROM ff_before
WHERE description_snippet IS NOT NULL AND old_description_snippet IS NOT NULL AND old_description_snippet IS DISTINCT FROM description_snippet
UNION ALL SELECT url,'transaction_type',old_transaction_type::text,transaction_type::text FROM ff_before
WHERE transaction_type IS NOT NULL AND old_transaction_type IS NOT NULL AND old_transaction_type IS DISTINCT FROM transaction_type
UNION ALL SELECT url,'property_type',old_property_type::text,property_type::text FROM ff_before
WHERE property_type IS NOT NULL AND old_property_type IS NOT NULL AND old_property_type IS DISTINCT FROM property_type
UNION ALL SELECT url,'city',old_city::text,city::text FROM ff_before
WHERE city IS NOT NULL AND old_city IS NOT NULL AND old_city IS DISTINCT FROM city
UNION ALL SELECT url,'district',old_district::text,district::text FROM ff_before
WHERE district IS NOT NULL AND old_district IS NOT NULL AND old_district IS DISTINCT FROM district
UNION ALL SELECT url,'surface_m2',old_surface_m2::text,surface_m2::text FROM ff_before
WHERE surface_m2 IS NOT NULL AND old_surface_m2 IS NOT NULL AND old_surface_m2 IS DISTINCT FROM surface_m2
UNION ALL SELECT url,'rooms_count',old_rooms_count::text,rooms_count::text FROM ff_before
WHERE rooms_count IS NOT NULL AND old_rooms_count IS NOT NULL AND old_rooms_count IS DISTINCT FROM rooms_count
UNION ALL SELECT url,'bedrooms_count',old_bedrooms_count::text,bedrooms_count::text FROM ff_before
WHERE bedrooms_count IS NOT NULL AND old_bedrooms_count IS NOT NULL AND old_bedrooms_count IS DISTINCT FROM bedrooms_count
UNION ALL SELECT url,'bathrooms_count',old_bathrooms_count::text,bathrooms_count::text FROM ff_before
WHERE bathrooms_count IS NOT NULL AND old_bathrooms_count IS NOT NULL AND old_bathrooms_count IS DISTINCT FROM bathrooms_count;

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM ff_conflicts;
  IF bad<>0 THEN RAISE EXCEPTION 'Live-value conflicts=%',bad; END IF;
END $$;

CREATE TEMP TABLE ff_apply_stats_before AS
SELECT
  count(*)::bigint AS staged_urls,
  sum(
    (title IS NOT NULL)::int +
    (description_snippet IS NOT NULL)::int +
    (transaction_type IS NOT NULL)::int +
    (property_type IS NOT NULL)::int +
    (city IS NOT NULL)::int +
    (district IS NOT NULL)::int +
    (surface_m2 IS NOT NULL)::int +
    (rooms_count IS NOT NULL)::int +
    (bedrooms_count IS NOT NULL)::int +
    (bathrooms_count IS NOT NULL)::int
  )::bigint AS candidate_fields,
  sum(
    (title IS NOT NULL AND old_title IS NULL)::int +
    (description_snippet IS NOT NULL AND old_description_snippet IS NULL)::int +
    (transaction_type IS NOT NULL AND old_transaction_type IS NULL)::int +
    (property_type IS NOT NULL AND old_property_type IS NULL)::int +
    (city IS NOT NULL AND old_city IS NULL)::int +
    (district IS NOT NULL AND old_district IS NULL)::int +
    (surface_m2 IS NOT NULL AND old_surface_m2 IS NULL)::int +
    (rooms_count IS NOT NULL AND old_rooms_count IS NULL)::int +
    (bedrooms_count IS NOT NULL AND old_bedrooms_count IS NULL)::int +
    (bathrooms_count IS NOT NULL AND old_bathrooms_count IS NULL)::int
  )::bigint AS writable_fields_before
FROM ff_before;

CREATE TEMP TABLE ff_updated_rows AS
WITH updated AS (
  UPDATE property_listings pl
  SET
    title=COALESCE(pl.title,b.title),
    description_snippet=COALESCE(pl.description_snippet,b.description_snippet),
    transaction_type=COALESCE(pl.transaction_type,b.transaction_type),
    property_type=COALESCE(pl.property_type,b.property_type),
    city=COALESCE(pl.city,b.city),
    district=COALESCE(pl.district,b.district),
    surface_m2=COALESCE(pl.surface_m2,b.surface_m2),
    rooms_count=COALESCE(pl.rooms_count,b.rooms_count),
    bedrooms_count=COALESCE(pl.bedrooms_count,b.bedrooms_count),
    bathrooms_count=COALESCE(pl.bathrooms_count,b.bathrooms_count)
  FROM ff_before b
  WHERE pl.id=b.property_listing_id
    AND (
      (b.title IS NOT NULL AND pl.title IS NULL) OR
      (b.description_snippet IS NOT NULL AND pl.description_snippet IS NULL) OR
      (b.transaction_type IS NOT NULL AND pl.transaction_type IS NULL) OR
      (b.property_type IS NOT NULL AND pl.property_type IS NULL) OR
      (b.city IS NOT NULL AND pl.city IS NULL) OR
      (b.district IS NOT NULL AND pl.district IS NULL) OR
      (b.surface_m2 IS NOT NULL AND pl.surface_m2 IS NULL) OR
      (b.rooms_count IS NOT NULL AND pl.rooms_count IS NULL) OR
      (b.bedrooms_count IS NOT NULL AND pl.bedrooms_count IS NULL) OR
      (b.bathrooms_count IS NOT NULL AND pl.bathrooms_count IS NULL)
    )
  RETURNING pl.id
)
SELECT * FROM updated;

CREATE TEMP TABLE ff_readback_mismatches AS
SELECT b.url,'title'::text field,pl.title::text actual,b.title::text expected FROM ff_before b JOIN property_listings pl ON pl.id=b.property_listing_id
WHERE b.title IS NOT NULL AND pl.title IS DISTINCT FROM b.title
UNION ALL SELECT b.url,'description_snippet',pl.description_snippet::text,b.description_snippet::text FROM ff_before b JOIN property_listings pl ON pl.id=b.property_listing_id
WHERE b.description_snippet IS NOT NULL AND pl.description_snippet IS DISTINCT FROM b.description_snippet
UNION ALL SELECT b.url,'transaction_type',pl.transaction_type::text,b.transaction_type::text FROM ff_before b JOIN property_listings pl ON pl.id=b.property_listing_id
WHERE b.transaction_type IS NOT NULL AND pl.transaction_type IS DISTINCT FROM b.transaction_type
UNION ALL SELECT b.url,'property_type',pl.property_type::text,b.property_type::text FROM ff_before b JOIN property_listings pl ON pl.id=b.property_listing_id
WHERE b.property_type IS NOT NULL AND pl.property_type IS DISTINCT FROM b.property_type
UNION ALL SELECT b.url,'city',pl.city::text,b.city::text FROM ff_before b JOIN property_listings pl ON pl.id=b.property_listing_id
WHERE b.city IS NOT NULL AND pl.city IS DISTINCT FROM b.city
UNION ALL SELECT b.url,'district',pl.district::text,b.district::text FROM ff_before b JOIN property_listings pl ON pl.id=b.property_listing_id
WHERE b.district IS NOT NULL AND pl.district IS DISTINCT FROM b.district
UNION ALL SELECT b.url,'surface_m2',pl.surface_m2::text,b.surface_m2::text FROM ff_before b JOIN property_listings pl ON pl.id=b.property_listing_id
WHERE b.surface_m2 IS NOT NULL AND pl.surface_m2 IS DISTINCT FROM b.surface_m2
UNION ALL SELECT b.url,'rooms_count',pl.rooms_count::text,b.rooms_count::text FROM ff_before b JOIN property_listings pl ON pl.id=b.property_listing_id
WHERE b.rooms_count IS NOT NULL AND pl.rooms_count IS DISTINCT FROM b.rooms_count
UNION ALL SELECT b.url,'bedrooms_count',pl.bedrooms_count::text,b.bedrooms_count::text FROM ff_before b JOIN property_listings pl ON pl.id=b.property_listing_id
WHERE b.bedrooms_count IS NOT NULL AND pl.bedrooms_count IS DISTINCT FROM b.bedrooms_count
UNION ALL SELECT b.url,'bathrooms_count',pl.bathrooms_count::text,b.bathrooms_count::text FROM ff_before b JOIN property_listings pl ON pl.id=b.property_listing_id
WHERE b.bathrooms_count IS NOT NULL AND pl.bathrooms_count IS DISTINCT FROM b.bathrooms_count;

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM ff_readback_mismatches;
  IF bad<>0 THEN RAISE EXCEPTION 'Readback mismatches=%',bad; END IF;
END $$;

CREATE TEMP TABLE ff_apply_summary AS
SELECT
  :apply_limit::int AS apply_limit,
  b.staged_urls,
  b.candidate_fields,
  b.writable_fields_before,
  (SELECT count(*) FROM ff_updated_rows)::bigint AS updated_property_rows,
  (SELECT count(*) FROM ff_readback_mismatches)::bigint AS readback_mismatches,
  0::bigint AS conflicts
FROM ff_apply_stats_before b;

COMMIT;

\copy (SELECT * FROM ff_apply_summary) TO '/work/artifacts/neon-full-field-write/apply-summary.csv' WITH (FORMAT csv, HEADER true);
\copy (SELECT * FROM ff_before ORDER BY url) TO '/work/artifacts/neon-full-field-write/before-targets.csv' WITH (FORMAT csv, HEADER true);
\copy (SELECT * FROM ff_readback_mismatches ORDER BY url,field) TO '/work/artifacts/neon-full-field-write/readback-mismatches.csv' WITH (FORMAT csv, HEADER true);

SELECT * FROM ff_apply_summary;
