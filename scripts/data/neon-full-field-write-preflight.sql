\set ON_ERROR_STOP on

CREATE TEMP TABLE ff_stage (
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

\copy ff_stage FROM '/work/artifacts/neon-full-field-write/full-field-write-stage.csv' WITH (FORMAT csv, HEADER true);

DO $$
DECLARE missing_cols text;
BEGIN
  SELECT string_agg(c, ', ' ORDER BY c)
  INTO missing_cols
  FROM unnest(ARRAY[
    'title','description_snippet','transaction_type','property_type','city','district',
    'surface_m2','rooms_count','bedrooms_count','bathrooms_count'
  ]) c
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='property_listings' AND column_name=c
  );
  IF missing_cols IS NOT NULL THEN
    RAISE EXCEPTION 'Missing property_listings columns: %', missing_cols;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listing_sources' AND column_name='listing_url'
  ) THEN RAISE EXCEPTION 'listing_sources.listing_url missing'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listing_sources' AND column_name='property_listing_id'
  ) THEN RAISE EXCEPTION 'listing_sources.property_listing_id missing'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listing_sources' AND column_name='is_active'
  ) THEN RAISE EXCEPTION 'listing_sources.is_active missing'; END IF;
END $$;

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
  IF bad<>0 THEN
    RAISE EXCEPTION 'Expected exactly one active property per staged URL; bad URLs=%', bad;
  END IF;
END $$;

CREATE TEMP TABLE ff_conflicts AS
SELECT s.url,'title'::text field,pl.title::text current_value,s.title::text candidate_value
FROM ff_stage s JOIN ff_match m USING(url) JOIN property_listings pl ON pl.id=m.property_listing_id
WHERE s.title IS NOT NULL AND pl.title IS NOT NULL AND pl.title IS DISTINCT FROM s.title
UNION ALL
SELECT s.url,'description_snippet',pl.description_snippet::text,s.description_snippet::text
FROM ff_stage s JOIN ff_match m USING(url) JOIN property_listings pl ON pl.id=m.property_listing_id
WHERE s.description_snippet IS NOT NULL AND pl.description_snippet IS NOT NULL AND pl.description_snippet IS DISTINCT FROM s.description_snippet
UNION ALL
SELECT s.url,'transaction_type',pl.transaction_type::text,s.transaction_type::text
FROM ff_stage s JOIN ff_match m USING(url) JOIN property_listings pl ON pl.id=m.property_listing_id
WHERE s.transaction_type IS NOT NULL AND pl.transaction_type IS NOT NULL AND pl.transaction_type IS DISTINCT FROM s.transaction_type
UNION ALL
SELECT s.url,'property_type',pl.property_type::text,s.property_type::text
FROM ff_stage s JOIN ff_match m USING(url) JOIN property_listings pl ON pl.id=m.property_listing_id
WHERE s.property_type IS NOT NULL AND pl.property_type IS NOT NULL AND pl.property_type IS DISTINCT FROM s.property_type
UNION ALL
SELECT s.url,'city',pl.city::text,s.city::text
FROM ff_stage s JOIN ff_match m USING(url) JOIN property_listings pl ON pl.id=m.property_listing_id
WHERE s.city IS NOT NULL AND pl.city IS NOT NULL AND pl.city IS DISTINCT FROM s.city
UNION ALL
SELECT s.url,'district',pl.district::text,s.district::text
FROM ff_stage s JOIN ff_match m USING(url) JOIN property_listings pl ON pl.id=m.property_listing_id
WHERE s.district IS NOT NULL AND pl.district IS NOT NULL AND pl.district IS DISTINCT FROM s.district
UNION ALL
SELECT s.url,'surface_m2',pl.surface_m2::text,s.surface_m2::text
FROM ff_stage s JOIN ff_match m USING(url) JOIN property_listings pl ON pl.id=m.property_listing_id
WHERE s.surface_m2 IS NOT NULL AND pl.surface_m2 IS NOT NULL AND pl.surface_m2 IS DISTINCT FROM s.surface_m2
UNION ALL
SELECT s.url,'rooms_count',pl.rooms_count::text,s.rooms_count::text
FROM ff_stage s JOIN ff_match m USING(url) JOIN property_listings pl ON pl.id=m.property_listing_id
WHERE s.rooms_count IS NOT NULL AND pl.rooms_count IS NOT NULL AND pl.rooms_count IS DISTINCT FROM s.rooms_count
UNION ALL
SELECT s.url,'bedrooms_count',pl.bedrooms_count::text,s.bedrooms_count::text
FROM ff_stage s JOIN ff_match m USING(url) JOIN property_listings pl ON pl.id=m.property_listing_id
WHERE s.bedrooms_count IS NOT NULL AND pl.bedrooms_count IS NOT NULL AND pl.bedrooms_count IS DISTINCT FROM s.bedrooms_count
UNION ALL
SELECT s.url,'bathrooms_count',pl.bathrooms_count::text,s.bathrooms_count::text
FROM ff_stage s JOIN ff_match m USING(url) JOIN property_listings pl ON pl.id=m.property_listing_id
WHERE s.bathrooms_count IS NOT NULL AND pl.bathrooms_count IS NOT NULL AND pl.bathrooms_count IS DISTINCT FROM s.bathrooms_count;

CREATE TEMP TABLE ff_preflight_summary AS
WITH base AS (
  SELECT
    (SELECT count(*) FROM property_listings)::bigint AS property_rows,
    (SELECT count(*) FROM listing_sources)::bigint AS source_rows,
    (SELECT count(*) FROM listing_sources WHERE is_active IS TRUE)::bigint AS active_source_rows,
    (SELECT count(*) FROM ff_stage)::bigint AS staged_urls,
    (
      SELECT sum(
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
      )::bigint FROM ff_stage
    ) AS staged_fields,
    (SELECT count(*) FROM ff_match WHERE match_count=1)::bigint AS exactly_matched_urls,
    (SELECT count(*) FROM ff_conflicts)::bigint AS conflicts
),
states AS (
  SELECT
    sum(
      (s.title IS NOT NULL AND pl.title IS NULL)::int +
      (s.description_snippet IS NOT NULL AND pl.description_snippet IS NULL)::int +
      (s.transaction_type IS NOT NULL AND pl.transaction_type IS NULL)::int +
      (s.property_type IS NOT NULL AND pl.property_type IS NULL)::int +
      (s.city IS NOT NULL AND pl.city IS NULL)::int +
      (s.district IS NOT NULL AND pl.district IS NULL)::int +
      (s.surface_m2 IS NOT NULL AND pl.surface_m2 IS NULL)::int +
      (s.rooms_count IS NOT NULL AND pl.rooms_count IS NULL)::int +
      (s.bedrooms_count IS NOT NULL AND pl.bedrooms_count IS NULL)::int +
      (s.bathrooms_count IS NOT NULL AND pl.bathrooms_count IS NULL)::int
    )::bigint AS writable_fields,
    sum(
      (s.title IS NOT NULL AND pl.title IS NOT NULL AND pl.title IS NOT DISTINCT FROM s.title)::int +
      (s.description_snippet IS NOT NULL AND pl.description_snippet IS NOT NULL AND pl.description_snippet IS NOT DISTINCT FROM s.description_snippet)::int +
      (s.transaction_type IS NOT NULL AND pl.transaction_type IS NOT NULL AND pl.transaction_type IS NOT DISTINCT FROM s.transaction_type)::int +
      (s.property_type IS NOT NULL AND pl.property_type IS NOT NULL AND pl.property_type IS NOT DISTINCT FROM s.property_type)::int +
      (s.city IS NOT NULL AND pl.city IS NOT NULL AND pl.city IS NOT DISTINCT FROM s.city)::int +
      (s.district IS NOT NULL AND pl.district IS NOT NULL AND pl.district IS NOT DISTINCT FROM s.district)::int +
      (s.surface_m2 IS NOT NULL AND pl.surface_m2 IS NOT NULL AND pl.surface_m2 IS NOT DISTINCT FROM s.surface_m2)::int +
      (s.rooms_count IS NOT NULL AND pl.rooms_count IS NOT NULL AND pl.rooms_count IS NOT DISTINCT FROM s.rooms_count)::int +
      (s.bedrooms_count IS NOT NULL AND pl.bedrooms_count IS NOT NULL AND pl.bedrooms_count IS NOT DISTINCT FROM s.bedrooms_count)::int +
      (s.bathrooms_count IS NOT NULL AND pl.bathrooms_count IS NOT NULL AND pl.bathrooms_count IS NOT DISTINCT FROM s.bathrooms_count)::int
    )::bigint AS already_same_fields
  FROM ff_stage s
  JOIN ff_match m USING(url)
  JOIN property_listings pl ON pl.id=m.property_listing_id
)
SELECT base.*,states.* FROM base CROSS JOIN states;

DO $$
DECLARE bad int;
BEGIN
  SELECT conflicts::int INTO bad FROM ff_preflight_summary;
  IF bad<>0 THEN RAISE EXCEPTION 'Live-value conflicts=%',bad; END IF;
END $$;

\copy (SELECT * FROM ff_preflight_summary) TO '/work/artifacts/neon-full-field-write/preflight-summary.csv' WITH (FORMAT csv, HEADER true);
\copy (SELECT * FROM ff_conflicts ORDER BY url,field) TO '/work/artifacts/neon-full-field-write/preflight-conflicts.csv' WITH (FORMAT csv, HEADER true);

SELECT * FROM ff_preflight_summary;
