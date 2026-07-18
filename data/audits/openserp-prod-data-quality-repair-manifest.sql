-- OPENSERP-PROD-DATA-QUALITY-REPAIR-1
-- Manifest for the 5 known open items from AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1.
-- Run in the Supabase SQL editor, Production project, as one transaction.
-- Review the SELECT ("BEFORE") outputs before letting the transaction COMMIT.
-- Scope: exactly these 5 property_listings rows. Nothing else is touched.
-- Nothing here invents a value: 555/593/631 go to NULL (not a guessed price),
-- 539 only flips to 'rent' because the stored title itself says so, 827 is
-- removed because it is a confirmed category/hub page, not a unit.

BEGIN;

-- ============================================================
-- BEFORE snapshot -- run this first and read the output
-- ============================================================
SELECT id, title, transaction_type, price_mad, source_name, listing_url, updated_at
FROM property_listings
WHERE id IN (539, 555, 593, 631, 827)
ORDER BY id;

-- ============================================================
-- 1) id=539 -- transaction_type sale -> rent
--    Basis: the stored title itself reads "a Louer" (rent); this was
--    reproduced directly against toTransactionType() on the exact stored
--    text during this mission and independently confirmed "rent". The
--    guard "AND transaction_type = 'sale'" makes this a no-op if the row
--    was already corrected or no longer matches the known bad state.
-- ============================================================
UPDATE property_listings
SET transaction_type = 'rent',
    updated_at = now()
WHERE id = 539
  AND transaction_type = 'sale';

-- ============================================================
-- 2) id=555, 593, 631 -- implausible price -> NULL (never a guessed value)
--    Known bad values being cleared: 50,000,000 / 312,490,000 / 32,224,000 MAD.
--    The guard on price_mad makes this a no-op if a value has already
--    changed since the snapshot above.
-- ============================================================
UPDATE property_listings
SET price_mad = NULL,
    updated_at = now()
WHERE id = 555 AND price_mad = 50000000;

UPDATE property_listings
SET price_mad = NULL,
    updated_at = now()
WHERE id = 593 AND price_mad = 312490000;

UPDATE property_listings
SET price_mad = NULL,
    updated_at = now()
WHERE id = 631 AND price_mad = 32224000;

-- ============================================================
-- 3) id=827 -- confirmed category/hub page (mubawab.ma/fr/st/el-jadida/
--    maisons-a-vendre, no numeric listing id in the URL), not one unit.
--    Remove its Market Index objects first (FK order matters: no ON DELETE
--    CASCADE on property_clusters/property_cluster_members), then the
--    public offer itself. Deleting property_listings cascades to
--    listing_sources automatically (ON DELETE CASCADE is set there).
--    discovery_candidates is left untouched -- it is an internal audit
--    trail, never public, and out of scope ("l'offre publique et ses
--    objets Market Index associes" only).
-- ============================================================
DELETE FROM property_cluster_members
WHERE property_cluster_id = (
  SELECT id FROM property_clusters WHERE legacy_property_listing_id = 827
);

DELETE FROM property_clusters
WHERE legacy_property_listing_id = 827;

DELETE FROM property_listings
WHERE id = 827;

-- ============================================================
-- AFTER snapshot -- confirm the expected end state before COMMIT:
--   539  -> 1 row, transaction_type = 'rent'
--   555, 593, 631 -> 3 rows, price_mad IS NULL
--   827  -> 0 rows (and its listing_sources/cluster/membership rows gone)
-- ============================================================
SELECT id, title, transaction_type, price_mad, source_name, listing_url, updated_at
FROM property_listings
WHERE id IN (539, 555, 593, 631, 827)
ORDER BY id;

SELECT (SELECT count(*) FROM property_listings)        AS property_listings_count,
       (SELECT count(*) FROM listing_sources)           AS listing_sources_count,
       (SELECT count(*) FROM property_clusters)          AS property_clusters_count,
       (SELECT count(*) FROM property_cluster_members)   AS property_cluster_members_count;
-- Expected: property_listings 559 -> 558, listing_sources 564 -> 563,
-- property_clusters 420 -> 419, property_cluster_members 420 -> 419.
-- Everything else must be byte-for-byte unchanged from before this script.

-- If the AFTER snapshot and counts match the expected end state above:
COMMIT;

-- If anything looks wrong, run ROLLBACK; instead of COMMIT; and report back
-- before retrying.
