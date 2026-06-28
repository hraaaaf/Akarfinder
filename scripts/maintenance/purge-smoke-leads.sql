-- ============================================================================
-- PURGE DES DONNÉES DE TEST (SMOKE / QA) — AkarFinder
-- OVERNIGHT-MVP-HARDENING-1 — Phase 4
-- ============================================================================
-- ⚠️  À EXÉCUTER MANUELLEMENT APRÈS VALIDATION ACHRAF.
-- ⚠️  AUCUNE suppression automatique. Rien n'est exécuté tant qu'Achraf ne lance
--     pas ce script lui-même dans le SQL Editor Supabase.
--
-- Conseil : exécuter d'abord les SELECT (vérification) avant les DELETE.
-- ============================================================================

-- ── 1) VÉRIFICATION (lecture seule) ─────────────────────────────────────────
-- Décommenter pour lister avant suppression :
-- SELECT id, full_name, phone_whatsapp, source_channel, created_at
-- FROM buyer_leads
-- WHERE id IN (
--   'a9c87599-1bbd-4467-9308-c001eee13551',
--   'b6d790b0-0852-4d42-ad30-86784231ef77',
--   '64e8629f-ce6c-4387-a7ee-04c9244e17b5',
--   '52cde12b-b57a-469a-b59d-7f8c42515624',
--   '6c5e91d7-44ad-4e14-a0e8-17c29b46d50c',
--   '8ade9c2f-a302-4409-86db-84018a006621',
--   'b4fb6e2e-57bf-40f6-a895-0f63c93e1094',
--   '2646ce3d-b32f-44cb-a365-bbfbe69f4132',
--   '7b036c0f-fb16-4941-8c5d-656b8a458f4f',
--   '5455c64c-8e08-4f5a-a493-d2360b299de5',
--   '09e40b8a-e16f-4ecd-b61c-0e0bb73ccae5'
-- );

-- ── 2) PURGE buyer_leads (leads de test connus) ─────────────────────────────
-- IDs fournis par la mission (8 SMOKE/QA + 1 PROD SMOKE CREDIT) :
DELETE FROM buyer_leads WHERE id IN (
  'a9c87599-1bbd-4467-9308-c001eee13551', -- SMOKE TEST LEADS-MVP acheter
  'b6d790b0-0852-4d42-ad30-86784231ef77', -- SMOKE TEST LEADS-MVP louer
  '64e8629f-ce6c-4387-a7ee-04c9244e17b5', -- SMOKE TEST SELLER-MVP
  '52cde12b-b57a-469a-b59d-7f8c42515624', -- SMOKE TEST PROMOTER-MVP
  '6c5e91d7-44ad-4e14-a0e8-17c29b46d50c', -- QA ACHETEUR TEST
  '8ade9c2f-a302-4409-86db-84018a006621', -- QA LOCATAIRE TEST
  'b4fb6e2e-57bf-40f6-a895-0f63c93e1094', -- QA VENDEUR TEST
  '2646ce3d-b32f-44cb-a365-bbfbe69f4132', -- QA PROMOTEUR TEST
  '7b036c0f-fb16-4941-8c5d-656b8a458f4f', -- PROD SMOKE CREDIT
  -- Ajoutés pendant OVERNIGHT-MVP-HARDENING-1 (smokes Phase 1 & 2) :
  '5455c64c-8e08-4f5a-a493-d2360b299de5', -- P1 CREDIT LISTING (smoke listing_id)
  '09e40b8a-e16f-4ecd-b61c-0e0bb73ccae5', -- P2 TRACK LEAD (smoke tracking)
  -- Smokes validation globale OVERNIGHT :
  'de803af5-7d59-4412-8162-d70aeaa9d81e', -- VG credit
  '2844860e-bb83-4b2b-a3cc-ca82c4f276f7', -- VG seller
  '6f2246b8-2c2e-4f8f-9561-fed1c40f8bf7'  -- VG promoter
);

-- ── 3) PURGE saved_alerts (alertes de test connues) ─────────────────────────
-- Alertes créées lors des smokes P18A / OVERNIGHT (à vérifier avant suppression) :
DELETE FROM saved_alerts WHERE id IN (
  '495be25d-8b01-4de7-973c-4453e7c72f46', -- smoke P18A alerte (Casablanca)
  '0ba027ea-99d9-4245-83c1-4af612668d1c', -- smoke P18A alerte (Rabat)
  '74801cc9-a9bb-4502-a7c1-fd38399f747c', -- smoke P2 alerte (Casablanca)
  'b969664d-5540-46ef-a57d-8ea9e52dda98'  -- smoke VG alerte (Tanger)
);

-- ── 4) (Optionnel) conversion_events de test ────────────────────────────────
-- Si la table conversion_events a été migrée et contient des events de smoke,
-- les events de test seront mêlés aux vrais. Ne PAS purger en masse.
-- Pour repartir propre AVANT mise en prod du tracking, exécuter une seule fois :
-- TRUNCATE TABLE conversion_events;
-- (à ne faire que si aucun évènement réel ne doit être conservé).
