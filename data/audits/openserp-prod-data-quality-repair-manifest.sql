-- OPENSERP-PROD-DATA-QUALITY-REPAIR-1
-- Manifest for the 5 known open items from AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1.
--
-- Single-paste, single-statement version. A prior 2-step version (separate
-- BEGIN...review...COMMIT pastes) silently did nothing in Supabase's pooled
-- SQL editor: the standalone "COMMIT;" ran on a different pooled connection
-- than the one holding the open transaction, so it committed nothing, and
-- the real transaction was later dropped when its connection recycled.
--
-- This version is one single DO block = one statement = one round trip on
-- one connection. Postgres auto-commits it as a whole if it completes, and
-- auto-rolls-back the whole thing if any RAISE EXCEPTION fires inside it --
-- no separate COMMIT/ROLLBACK step, no room for a pooling mismatch.
--
-- Run this ENTIRE block in one paste. Read the NOTICE lines in the
-- Supabase SQL editor's results/logs panel afterward to see what happened.
--
-- Scope: exactly these 5 property_listings rows. Nothing else is touched.
-- Nothing here invents a value: 555/593/631 go to NULL (not a guessed
-- price), 539 only flips to 'rent' because the stored title itself says
-- so, 827 is removed because it is a confirmed category/hub page, not a
-- unit. If any check fails, the whole thing aborts automatically -- no
-- partial writes are possible.

DO $$
DECLARE
  v_listings_before   int;
  v_sources_before    int;
  v_clusters_before   int;
  v_members_before    int;
  v_listings_after    int;
  v_sources_after     int;
  v_clusters_after    int;
  v_members_after     int;
  v_539_tx            text;
  v_555_price         bigint;
  v_593_price         bigint;
  v_631_price         bigint;
  v_827_count         int;
BEGIN
  SELECT count(*) INTO v_listings_before FROM property_listings;
  SELECT count(*) INTO v_sources_before  FROM listing_sources;
  SELECT count(*) INTO v_clusters_before FROM property_clusters;
  SELECT count(*) INTO v_members_before  FROM property_cluster_members;
  RAISE NOTICE 'BEFORE: property_listings=%, listing_sources=%, property_clusters=%, property_cluster_members=%',
    v_listings_before, v_sources_before, v_clusters_before, v_members_before;

  -- 1) id=539: transaction_type sale -> rent (title itself reads "a Louer")
  UPDATE property_listings
  SET transaction_type = 'rent', updated_at = now()
  WHERE id = 539 AND transaction_type = 'sale';

  -- 2) id=555, 593, 631: implausible price -> NULL (never a guessed value)
  UPDATE property_listings SET price_mad = NULL, updated_at = now()
  WHERE id = 555 AND price_mad = 50000000;

  UPDATE property_listings SET price_mad = NULL, updated_at = now()
  WHERE id = 593 AND price_mad = 312490000;

  UPDATE property_listings SET price_mad = NULL, updated_at = now()
  WHERE id = 631 AND price_mad = 32224000;

  -- 3) id=827: confirmed category/hub page, not one unit. Market Index
  --    objects first (no ON DELETE CASCADE on these two), then the public
  --    offer itself (cascades to listing_sources automatically).
  DELETE FROM property_cluster_members
  WHERE property_cluster_id = (
    SELECT id FROM property_clusters WHERE legacy_property_listing_id = 827
  );

  DELETE FROM property_clusters
  WHERE legacy_property_listing_id = 827;

  DELETE FROM property_listings
  WHERE id = 827;

  -- ============================================================
  -- Verification -- if ANY of this doesn't hold, abort everything.
  -- ============================================================
  SELECT transaction_type INTO v_539_tx FROM property_listings WHERE id = 539;
  SELECT price_mad INTO v_555_price FROM property_listings WHERE id = 555;
  SELECT price_mad INTO v_593_price FROM property_listings WHERE id = 593;
  SELECT price_mad INTO v_631_price FROM property_listings WHERE id = 631;
  SELECT count(*) INTO v_827_count FROM property_listings WHERE id = 827;

  SELECT count(*) INTO v_listings_after FROM property_listings;
  SELECT count(*) INTO v_sources_after  FROM listing_sources;
  SELECT count(*) INTO v_clusters_after FROM property_clusters;
  SELECT count(*) INTO v_members_after  FROM property_cluster_members;

  RAISE NOTICE 'AFTER: id539.transaction_type=%, id555.price_mad=%, id593.price_mad=%, id631.price_mad=%, id827_count=%',
    v_539_tx, v_555_price, v_593_price, v_631_price, v_827_count;
  RAISE NOTICE 'AFTER: property_listings=%, listing_sources=%, property_clusters=%, property_cluster_members=%',
    v_listings_after, v_sources_after, v_clusters_after, v_members_after;

  IF v_539_tx IS DISTINCT FROM 'rent' THEN
    RAISE EXCEPTION 'ABORT: id=539 transaction_type is % not rent', v_539_tx;
  END IF;
  IF v_555_price IS NOT NULL OR v_593_price IS NOT NULL OR v_631_price IS NOT NULL THEN
    RAISE EXCEPTION 'ABORT: one of 555/593/631 still has a non-null price_mad (%, %, %)', v_555_price, v_593_price, v_631_price;
  END IF;
  IF v_827_count <> 0 THEN
    RAISE EXCEPTION 'ABORT: id=827 still exists (% rows)', v_827_count;
  END IF;
  IF v_listings_after <> v_listings_before - 1 THEN
    RAISE EXCEPTION 'ABORT: property_listings count changed by more than 1 (before=%, after=%)', v_listings_before, v_listings_after;
  END IF;
  IF v_clusters_after <> v_clusters_before - 1 OR v_members_after <> v_members_before - 1 THEN
    RAISE EXCEPTION 'ABORT: property_clusters/members count changed unexpectedly (clusters %->%, members %->%)',
      v_clusters_before, v_clusters_after, v_members_before, v_members_after;
  END IF;

  RAISE NOTICE 'ALL CHECKS PASSED -- committing.';
END $$;
