\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;

SELECT
  current_database() AS database_name,
  current_user AS current_user,
  current_setting('server_version') AS server_version,
  current_setting('wal_level') AS wal_level,
  current_setting('max_replication_slots') AS max_replication_slots,
  current_setting('max_wal_senders') AS max_wal_senders,
  current_setting('max_logical_replication_workers', true) AS max_logical_replication_workers,
  current_setting('max_sync_workers_per_subscription', true) AS max_sync_workers_per_subscription;

SELECT
  rolname,
  rolsuper,
  rolreplication,
  rolbypassrls
FROM pg_roles
WHERE rolname = current_user;

WITH ha_tables(table_name) AS (
  VALUES
    ('property_listings'),
    ('listing_sources'),
    ('property_clusters'),
    ('property_cluster_members'),
    ('thin_index_search_documents'),
    ('source_policy_registry'),
    ('professional_listing_ownership'),
    ('search_business_entitlements'),
    ('buyer_leads'),
    ('seller_property_drafts'),
    ('seller_listing_publications'),
    ('owner_listing_representations'),
    ('source_offer_observations'),
    ('geo_entities'),
    ('geo_resolution_events'),
    ('source_offer_seeds')
)
SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  c.relreplident AS replica_identity_code,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
    ELSE c.relreplident::text
  END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN ha_tables h ON h.table_name = c.relname
WHERE c.relkind IN ('r', 'p')
  AND n.nspname = 'public'
ORDER BY c.relname;

WITH ha_tables(table_name) AS (
  VALUES
    ('property_listings'),
    ('listing_sources'),
    ('property_clusters'),
    ('property_cluster_members'),
    ('thin_index_search_documents'),
    ('source_policy_registry'),
    ('professional_listing_ownership'),
    ('search_business_entitlements'),
    ('buyer_leads'),
    ('seller_property_drafts'),
    ('seller_listing_publications'),
    ('owner_listing_representations'),
    ('source_offer_observations'),
    ('geo_entities'),
    ('geo_resolution_events'),
    ('source_offer_seeds')
)
SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) AS primary_key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_catalog = tc.constraint_catalog
 AND kcu.constraint_schema = tc.constraint_schema
 AND kcu.constraint_name = tc.constraint_name
JOIN ha_tables h ON h.table_name = tc.table_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_schema, tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

WITH ha_tables(table_name) AS (
  VALUES
    ('property_listings'),
    ('listing_sources'),
    ('property_clusters'),
    ('property_cluster_members'),
    ('thin_index_search_documents'),
    ('source_policy_registry'),
    ('professional_listing_ownership'),
    ('search_business_entitlements'),
    ('buyer_leads'),
    ('seller_property_drafts'),
    ('seller_listing_publications'),
    ('owner_listing_representations'),
    ('source_offer_observations'),
    ('geo_entities'),
    ('geo_resolution_events'),
    ('source_offer_seeds')
)
SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.column_default,
  c.is_identity,
  c.identity_generation
FROM information_schema.columns c
JOIN ha_tables h ON h.table_name = c.table_name
WHERE c.table_schema = 'public'
  AND (
    c.is_identity = 'YES'
    OR c.column_default LIKE 'nextval(%'
  )
ORDER BY c.table_name, c.ordinal_position;

SELECT
  schemaname AS sequence_schema,
  sequencename AS sequence_name,
  data_type,
  start_value,
  min_value,
  max_value,
  increment_by,
  cycle,
  cache_size
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

SELECT
  slot_name,
  plugin,
  slot_type,
  database,
  active,
  restart_lsn,
  confirmed_flush_lsn,
  wal_status,
  safe_wal_size
FROM pg_replication_slots
ORDER BY slot_name;

SELECT
  subname,
  subenabled,
  subslotname,
  subsynccommit,
  suborigin
FROM pg_subscription
ORDER BY subname;

COMMIT;
