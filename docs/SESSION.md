# AkarFinder — Session courante

**Mise à jour : 2026-08-10 20:57 +01:00**

`docs/ROADMAP.md` est l’unique roadmap de toutes les fenêtres. Lire : `README.md` → `docs/ROADMAP.md` → ce fichier → doc spécialisée éventuelle.

## Règle universelle

`IMPLEMENTATION → DOUBLE CHECK → NOTE /10 → CORRECTIONS → RE-TEST → RE-NOTE → CERTIFICATION`.

Aucun lot CLOSED < **9,0/10**.

## PR réellement actives

### #474 — MASS-FIRST + canonical unified roadmap 🟠 P0

Branche `feat/mass-first-search-quality-policy`.

Responsabilité : Source Policy public gate ; Quality ≠ Eligibility ; Listing Power 0–100 ; Search ranking ; mass reclassification/certification.

Score provisoire **8,8/10 — non certifié**. Restent CI exact-head, PostgreSQL/Supabase proof, reports, sécurité ACL/SECURITY DEFINER, perf Search, before/after, Reviewer et Release Certifier. Aucun merge avant ≥9.

### #473 — SEARCH-UX-1 Inventory-first cards & grid 🟠 P0 parallèle

Branche `feat/search-ux-1-cards-grid`.

Cible : wide desktop 4 cards, desktop 3, tablette/mobile 2 ; cards compactes image-first ; whole-card click ; provenance/truth/favoris préservés.

Preuve actuelle : smoke UI/accessibilité **12 routes × 4 viewports = 48 captures, 0 finding**. Le score final indépendant n’est pas encore enregistré ; desktop 1440×900 et mobile 390×844 doivent tous deux atteindre ≥9/10.

#473 peut avancer en parallèle de #474, mais le second à merger doit se réaligner sur le nouveau `main` puis rejouer les gates complets.

## PR à réconcilier / bloquées

### #454 — DATA-4.9C — RECONCILIATION REQUIRED

Branche `data/data-4-9c-source-policy-decision-registry-assignment`.

Une mutation restrictive production a déjà été appliquée : `agadirimmobilier.ma = permission_required + hidden + internal_signal_only`.

Les cinq autres sources du cohort restent `unverified`. **0 source autorisée** ; DATA-4.9D pour ce cohort est `BLOCKED_BY_POLICY`.

Avant merge/close : comparer à current main + Registry live, préserver Agadir, ne reconstruire que le résidu encore nécessaire, re-certifier ≥9. Si tout le code est supersédé, closeout documentaire puis fermeture superseded.

### #310 — BLOCKED / Security revalidation

Vieille branche `agent/b3-5-3-professional-auth-rls`. Re-audit current main avant toute reprise ; aucun merge direct. Si le finding RLS/auth existe toujours, reconstruire un lot frais avec PostgreSQL réel + Security Reviewer + score ≥9/10. Sinon fermer superseded.

### #383 — RECONCILIATION REQUIRED / superseded candidate

Branche `agent/p0-gov-1-agent-governance`. La roadmap unique, Reviewer/Certifier et gate ≥9 sont déjà absorbés. Faire un unique-value check ; ne porter que ce qui manque réellement, sinon fermer superseded.

## Fenêtre DATA-4.4C — réconciliation historique ✅

DATA-4.4C n’est plus une prochaine étape ; il est **CLOSED / HISTORICAL**.

- dépendance : DATA-4.4B PR #380 ;
- PR #384 safety fix, branche `agent/data-4-4c-freshness-projection-safety`, merge `ba65943ab71e57eabbe96b0641e8cbdc544ed891` ;
- PR #385 closeout docs, branche `agent/data-4-4c-closeout`, merge `c036bb061ce4d083e264254387b8eac77f53b565` ;
- premier write : anomalie Thin Index détectée fail-closed → rollback ;
- projections restaurées depuis snapshots A5.2/A5.3/A5.4 ;
- migration safety production appliquée ;
- second write exact : **50/50** ;
- fresh-confirmed, sitemap presence, Public Search, technical display, quality A/B, projection préservée : **50/50** ;
- drift : **0%** ; Registry inchangé ;
- Promo Immo final : **3 005 total / 59 fresh / 2 946 seed_only / 50 sitemap-presence** ;
- #385 : **21/21 workflows exact-head verts** ;
- double-check de réconciliation : **9,6/10** ; cette note ne remplace pas un score historique qui n’avait pas été formalisé.

Aucun +100/+500 automatique ne découle de 4.4C. Les lanes DATA ultérieures 4.7/4.9 puis MASS-FIRST prévalent.

## Classification des anciennes PR OPEN

Le snapshot exhaustif est dans `docs/ROADMAP.md`.

- **ACTIVE** : #474, #473.
- **RECONCILIATION REQUIRED** : #454, #383.
- **BLOCKED** : #310.
- **SUPERSEDED** : #228, #229, #230, #231, #232, #234, #250, #81, #282, #52.
- **HISTORICAL** : #337, #319, #289, #255, #113, #133, #54, #126, #125, #124, #121, #118, #115, #110.

Aucune PR historique/superseded n’est active uniquement parce qu’elle reste `OPEN`.

## DATA prochaine

**DATA-4.9B est CLOSED ✅ — PR #452 mergée** (`45631345a6efb653256273354d2fb903b33c1ff9`). Le compteur **2 326** désigne des représentations URL structurellement compatibles détail, jamais un nombre de biens uniques.

Après réconciliation #454 : **DATA-4.10A Authorization Conversion & Partner Feed Readiness**, read-only. MASS COVERAGE continue seulement sur sources policy-admissibles.

DATA doit également produire l’evidence exact-scope Registry + profondeur/fraîcheur requise pour le replay Carte P1C.4A/P1C.4. Cette preuve Guéliz ne doit pas être assimilée automatiquement à #454 : si elle exige un nouveau travail, créer un lot DATA séparé et borné.

## Carte / Geo — handover P1C aligné

Préconditions Geo P1B.9→P1B.15 : **CLOSED**. P1B.15 #462 a certifié **13/13** lineages contrôlées et n’autorise que P1C Shadow ; Offre publique et choroplèthe quartier restent OFF.

- **P1C.1 ✅ #463** — Offre quartier Shadow ; merge `9c53a999...` ; **102/102** observations Geo, 18 quartiers, 32 segments ; 22/22 exact-head PASS ; score de réconciliation **9,4/10**.
- **P1C.2 ✅ #464 + correction #465** — Reliability Engine ; 96 metric rows = 92 insufficient / 3 limited / 1 moderate / 0 strong ; seul moderate = Guéliz/rent/surface_m2, n=10, 9 fresh, 3 sources ; cycle finding RPC timeout → correction → re-test vert ; score **9,5/10**.
- **P1C.3 ✅ HOLD #466** — 1 review candidate, **0 canary eligible**, verdict `P1C3_ACTIVATION_REVIEW_HOLD` ; score **9,5/10**.
- **P1C.4 ✅ NOT_CERTIFIABLE #469** — 10 observations / 9 fresh / 3 sources, mais aucun dénominateur indépendant exact-scope ; 25/25 exact-head + Reviewer/Certifier live PASS ; score **9,6/10**.
- **#470 = SUPERSEDED/HISTORICAL**, duplicate concurrent P1C.4 fermé sans merge après #469 ; ne pas rouvrir.
- **P1C.4A ✅ DESIGNED_NOT_PROVEN #472** — baseline indépendante versionnée 12 sources, exact-scope discovery challenger seulement ; merge `f4563602119c8c01298bf694285e35856097bbd6` ; 26/26 exact-head SUCCESS ; post-merge run `31414213930` Reviewer + Release Certifier SUCCESS ; métier inchangé : **10 samples / 9 fresh / 3 sources / moderate / SHADOW**, representativeness/public activation/metric layers = false ; score **9,6/10**.
- **P1C.5 🔒 BLOCKED** — aucune branche, aucune PR. Ne pas coder tant que P1C.4A n’est pas réellement `PROVEN` et qu’un replay P1C.4 ne retourne pas `CERTIFIED`.

Ordre Carte canonique :

`DATA exact-scope evidence → replay P1C.4A → replay P1C.4 → si CERTIFIED seulement P1C.5 canary → P1C.6 observation → P1C.7 scoped ON`.

Les notes P1C ci-dessus sont des **notes de double-check/réconciliation de cette fenêtre**, établies à partir des preuves CI/live/merge ; elles ne prétendent pas réécrire un score historique qui n’aurait pas été formalisé.

## UX après #473

`CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1` read-only avant tout nouvel asset.

## Invariants

No-bypass ; Source Registry autoritaire ; aucune donnée/géométrie inventée ; Search canonique ; branches parallèles sans écrasement ; merge uniquement sur current main réaligné ; exact-head CI + double check + score ≥9 ; README/ROADMAP/SESSION mis à jour au closeout.
