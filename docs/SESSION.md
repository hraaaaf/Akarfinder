# AkarFinder — Session courante

**Mise à jour : 2026-08-10 20:52 +01:00**

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

### SEARCH-VISUAL-REFERENCE-AUDIT-1 🟠 REVIEW

Branche docs/audit : `audit/live-rabat-search-20260810`, réalignée sur le head exact #474 `6e712ed318f88418f34f774c3bc48826d729a5a4` avant ce handover.

Objectif : comparer `/search?city=Rabat` desktop/mobile au visuel de référence approuvé avant toute nouvelle implémentation.

Preuve fraîche : Product Design workflow `31417065973` SUCCESS ; artefact `product-design-rabat-audit` id `9073861382`, digest `sha256:355a13772550fe1fdc735a088311213207ab02989757206d88da9ca9d0f65363` ; captures live 1440×900 et 390×844.

Finding déjà confirmé : la bibliothèque Rabat existe mais beaucoup de résultats live restent sur illustration faute de `listing.neighborhood` structuré ; aucune inférence depuis titre/snippet ne doit être introduite pour contourner cette limite.

**Score comparatif final : non encore émis.** Ce lot reste ouvert jusqu’au score séparé desktop/mobile et à la priorisation P0/P1/P2.

## Visual truth — acquis et suite

### RABAT-REAL-PHOTO-LIBRARY-1 ✅ CLOSED — #468 / closeout #471

- 40 vraies photos Commons = 8 × Agdal/Hay Riad/Souissi/Océan/Hassan ;
- 40/40 sources/licences ;
- exact-head 29/29 workflows ;
- Chromium 5 viewports ; mobile 2 colonnes ;
- UX final **9,2/10** ; Reviewer PASS ; Release Certifier GO ;
- photo du bien autorisée reste prioritaire ; district photo uniquement sur `listing.neighborhood` structuré reconnu.

### Akar Visual Stack — doctrine verrouillée

`PROPERTY_PHOTO → BUILDING/STREET_PHOTO → DISTRICT_PHOTO → CITY_PHOTO → TYPE_ILLUSTRATION → NEUTRAL`

Les anciens visuels Appartement/Villa/Terrain/Bureau/Commerce sont conservés comme **langage type/fallback explicite**, jamais comme pseudo-photo du bien. Aucune image générée/fictive ne doit représenter un quartier ou un bien réel.

Mobile **2 annonces par ligne** reste un invariant à 360/390 px.

### VISUAL-REPRESENTATION-ENGINE-1 🔵 PLANNED

Dépend du verdict de l’audit visuel + current main Search stabilisé après #473/#474. Aucun branch/PR produit créé. Resolver central attendu : priorité property photo, district/city seulement sur signaux structurés, type illustration ensuite, neutral en dernier ; titre `Agdal` avec `neighborhood=null` ne doit jamais activer Agdal.

### VISUAL-CARD-COMPOSITION-1 🔵 PLANNED AFTER ENGINE

Photo réelle de contexte en image principale + identité/type AkarFinder discrète + disclosure explicite. Pas deux images concurrentes dans la card. Dépend de l’engine certifié et de #473 certifiée.

### RABAT-NEIGHBORHOOD-ACTIVATION-1 🔵 PLANNED AFTER ENGINE

Augmenter l’usage réel des 40 photos uniquement via quartier structuré, adresse/coordonnées sourcées ou autre preuve certifiée ; aucun titre/snippet libre comme vérité finale.

`CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1` n’est plus la prochaine action autonome : ses métriques sont absorbées comme preuves obligatoires du programme Visual Stack.

## PR à réconcilier

### #454 — DATA-4.9C

Une mutation restrictive production a déjà été appliquée : `agadirimmobilier.ma = permission_required + hidden + internal_signal_only`.

Les cinq autres sources du cohort restent `unverified`. **0 source autorisée** ; DATA-4.9D pour ce cohort est `BLOCKED_BY_POLICY`.

Avant merge/close : comparer à current main + Registry live, préserver Agadir, ne reconstruire que le résidu encore nécessaire, re-certifier ≥9. Si tout le code est supersédé, closeout documentaire puis fermeture superseded.

## Backlog à revalider

- #310 Professional auth/session/RLS : re-audit current main avant toute reprise ; vieux branch interdit au merge direct.
- #383 governance : probablement largement superseded par la roadmap/gouvernance actuelles ; comparer puis fermer si aucune capacité unique ne manque.
- autres vieilles PR GitHub ouvertes : historique par défaut, jamais actives uniquement parce que `OPEN`.
- DATA-4.9B #452 est **MERGED/CLOSED**, pas actif malgré d’anciens libellés historiques.

## DATA prochaine

Après réconciliation #454 : **DATA-4.10A Authorization Conversion & Partner Feed Readiness**, read-only. MASS COVERAGE continue seulement sur sources policy-admissibles.

DATA doit également produire l’evidence exact-scope Registry + profondeur/fraîcheur requise pour le replay Carte P1C.4A/P1C.4.

## Carte / Geo

P1C.4 = `NOT_CERTIFIABLE`, P1C.4A = `DESIGNED_NOT_PROVEN`, P1C.5 LOCKED. Offre quartier publique OFF.

Ordre : DATA exact-scope evidence → replay P1C.4A → replay P1C.4 → éventuel P1C.5 canary → observation → scoped ON.

## Ordre UX/Search de cette fenêtre

1. finir `SEARCH-VISUAL-REFERENCE-AUDIT-1` et scorer desktop/mobile ;
2. laisser #473/#474 atteindre current main sans base stale ;
3. `VISUAL-REPRESENTATION-ENGINE-1` ;
4. `VISUAL-CARD-COMPOSITION-1` ;
5. `RABAT-NEIGHBORHOOD-ACTIVATION-1` ;
6. seulement ensuite décider d’un scale Casablanca/autres villes depuis les métriques réelles.

## Invariants

No-bypass ; Source Registry autoritaire ; aucune donnée/géométrie/image de quartier inventée ; Search canonique ; branches parallèles sans écrasement ; merge uniquement sur current main réaligné ; exact-head CI + double check + score ≥9 ; mobile 2 colonnes ; README/ROADMAP/SESSION mis à jour au closeout.
