# AkarFinder — Session courante

**Mise à jour : 2026-08-10 21:38 +01:00**

`docs/ROADMAP.md` est désormais l’unique roadmap de **tout le travail connu**, y compris les lots non commencés. Lire : `README.md` → `docs/ROADMAP.md` → ce fichier → doc spécialisée éventuelle.

## Règle universelle

`IMPLEMENTATION → DOUBLE CHECK INDÉPENDANT → NOTE /10 → CORRECTIONS → RE-TEST → RE-NOTE → CERTIFICATION`

Aucun lot `CLOSED` sous **9,0/10**.

## P0 actuel

### #474 — MASS-FIRST

Branche `feat/mass-first-search-quality-policy`. Source Policy public gate ; Quality ≠ Eligibility ; Listing Power 0–100 ; Search ranking ; mass reclassification/certification.

Score provisoire **8,8/10 — non certifié**. Merge interdit avant ≥9.

### #473 — SEARCH-UX-1

Branche `feat/search-ux-1-cards-grid`. Cible 4 wide desktop / 3 desktop / 2 tablette / 2 mobile. Certification indépendante desktop/mobile ≥9 obligatoire.

Le second à merger entre #473/#474 doit repartir du nouveau `main` et rejouer tous les gates.

## DATA enregistrée dans la roadmap maître

- #454 DATA-4.9C : `RECONCILIATION_REQUIRED`; Agadir restrictive policy déjà en production ; 0 source du cohort autorisée.
- DATA-4.10A : Authorization Conversion & Partner Feed Readiness — PLANNED.
- MASS-COVERAGE-ADMISSIBLE-1 — PLANNED après #474.
- DATA-EXACT-SCOPE-GUELIZ-1 — PLANNED pour débloquer Carte.

## Search Visual enregistré dans la roadmap maître

Le contenu utile de #475 est absorbé dans `docs/ROADMAP.md` :

- SEARCH-VISUAL-REFERENCE-AUDIT-1 — REVIEW ;
- doctrine Akar Visual Stack ;
- VISUAL-REPRESENTATION-ENGINE-1 — PLANNED ;
- VISUAL-CARD-COMPOSITION-1 — PLANNED ;
- RABAT-NEIGHBORHOOD-ACTIVATION-1 — PLANNED ;
- CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1 absorbé comme evidence obligatoire.

#475 reste une PR docs-only dépendante de #474 ; après absorption/rebase, elle peut être fermée superseded si aucun delta unique ne reste.

## Carte/P1C enregistrée dans la roadmap maître

Le contenu utile de #476 est absorbé dans `docs/ROADMAP.md` :

- P1C.1/P1C.2/P1C.3 fermés ;
- P1C.4 `NOT_CERTIFIABLE` fermé ;
- P1C.4A `DESIGNED_NOT_PROVEN` fermé ;
- P1C.4A-REPLAY — PLANNED après DATA exact-scope ;
- P1C.4-REPLAY — PLANNED après preuve P1C.4A ;
- P1C.5 bounded canary — LOCKED ;
- P1C.6 observation — PLANNED_AFTER_P1C5 ;
- P1C.7 scoped public ON — PLANNED_AFTER_P1C6 ;
- choroplèthe quartier bloqué sans géométrie neighborhood-grade sourcée/certifiée.

#476 reste docs-only dépendante de #474 ; elle ne constitue plus une roadmap concurrente.

## Security

AUTH-RLS-REVALIDATION est maintenant un lot PLANNED explicite : audit current-main de #310. Finding réel → nouveau lot frais ; sinon fermeture superseded.

## Mon Projet

MON-PROJET-P1B #318 = MERGED/HISTORICAL. Aucun nouveau lot actif enregistré.

## Gouvernance cross-window

Toute fenêtre doit désormais écrire **ses lots futurs aussi** dans `docs/ROADMAP.md`, même si branche/PR = `à créer`. Les docs spécialisées sont des détails/preuves uniquement.

Si deux fenêtres proposent le même lot : fusion du plan avant code. Si deux PR touchent le même contrat : ordre de merge explicite dans la roadmap avant merge.

## Invariants

No-bypass ; Source Registry autoritaire ; aucune donnée/géométrie inventée ; Search canonique ; branches parallèles sans écrasement ; merge uniquement sur current main réaligné ; exact-head CI + double check + score ≥9 ; README/ROADMAP/SESSION synchronisés au closeout.
