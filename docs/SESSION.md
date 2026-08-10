# AkarFinder — Session courante

**Mise à jour : 2026-08-10 20:35 +01:00**

`docs/ROADMAP.md` est l’unique roadmap de toutes les fenêtres. Lire : `README.md` → `docs/ROADMAP.md` → ce fichier → doc spécialisée éventuelle.

## Règle universelle

`IMPLEMENTATION → DOUBLE CHECK → NOTE /10 → CORRECTIONS → RE-TEST → RE-NOTE → CERTIFICATION`.

Aucun lot CLOSED < **9,0/10**.

## PR réellement actives

### #474 — MASS-FIRST + canonical unified roadmap 🟠 P0

Branche `feat/mass-first-search-quality-policy`.

5 lots codés : Source Policy public gate ; Quality ≠ Eligibility ; Listing Power 0–100 ; Search ranking ; mass reclassification/certification.

Score provisoire **8,8/10 — non certifié**. Restent notamment CI exact-head, PostgreSQL/Supabase proof, reports, sécurité ACL/SECURITY DEFINER, perf Search, before/after, Reviewer et Release Certifier. Aucun merge avant ≥9.

### #473 — SEARCH-UX-1 Inventory-first cards & grid 🟠 P0 parallèle

Branche `feat/search-ux-1-cards-grid`.

Cible : wide desktop 4 cards, desktop 3, tablette/mobile 2 ; cards compactes image-first ; whole-card click ; provenance/truth/favoris préservés.

Certification desktop + mobile ≥9/10. Peut avancer en parallèle de #474, mais le second à merger doit se réaligner sur le nouveau `main` puis rejouer les gates complets.

## PR à réconcilier

### #454 — DATA-4.9C

Une mutation restrictive production a déjà été appliquée : `agadirimmobilier.ma = permission_required + hidden + internal_signal_only`.

Les cinq autres sources du cohort restent `unverified`. **0 source autorisée** ; DATA-4.9D pour ce cohort est `BLOCKED_BY_POLICY`.

Avant merge/close : comparer à current main + Registry live, préserver Agadir, ne reconstruire que le résidu encore nécessaire, re-certifier ≥9. Si tout le code est supersédé, closeout documentaire puis fermeture superseded.

## Backlog à revalider

- #310 Professional auth/session/RLS : re-audit current main avant toute reprise ; vieux branch interdit au merge direct.
- #383 governance : probablement largement superseded par la roadmap/gouvernance actuelles ; comparer puis fermer si aucune capacité unique ne manque.
- autres vieilles PR GitHub ouvertes : historique par défaut, jamais actives uniquement parce que `OPEN`.

## DATA prochaine

Après réconciliation #454 : **DATA-4.10A Authorization Conversion & Partner Feed Readiness**, read-only. MASS COVERAGE continue seulement sur sources policy-admissibles.

DATA doit également produire l’evidence exact-scope Registry + profondeur/fraîcheur requise pour le replay Carte P1C.4A/P1C.4.

## Carte / Geo

P1C.4 = `NOT_CERTIFIABLE`, P1C.4A = `DESIGNED_NOT_PROVEN`, P1C.5 LOCKED. Offre quartier publique OFF.

Ordre : DATA exact-scope evidence → replay P1C.4A → replay P1C.4 → éventuel P1C.5 canary → observation → scoped ON.

## UX après #473

`CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1` read-only avant tout nouvel asset.

## Invariants

No-bypass ; Source Registry autoritaire ; aucune donnée/géométrie inventée ; Search canonique ; branches parallèles sans écrasement ; merge uniquement sur current main réaligné ; exact-head CI + double check + score ≥9 ; README/ROADMAP/SESSION mis à jour au closeout.
