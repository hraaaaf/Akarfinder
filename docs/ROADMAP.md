# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-08**  
**Statut : UX/Carte P1B.4 ✅ production certifiée ; couche Offre quartier toujours OFF ; DATA-4.4C ✅ canary 50 persistant certifié ; prochaine décision DATA à définir explicitement**

`README.md` définit l’identité/doctrine. `docs/SESSION.md` porte le handover court. Ce fichier est l’unique roadmap.

# 1. Cap produit

AkarFinder = **moteur de recherche immobilier + index national + couche d’intelligence** pour le Maroc.

- cœur produit : `/search` ;
- `/map` : complément spatial ;
- objectif long terme : **Property Graph du marché immobilier marocain** ;
- North Star DATA : `COVERAGE × FRESHNESS × QUALITY × DEDUP × RELEVANCE` ;
- paliers : **5K → 20K → 50K → 100K+** observations utiles, jamais du volume artificiel.

Pipeline canonique :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

# 2. Doctrine non négociable

- no-bypass absolu ;
- robots/sitemap/capability ≠ permission ;
- Source Registry obligatoire avant activation ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- aucune donnée/image/géométrie/coordonnée/proximité/partenariat inventé ;
- Search reste canonique ; Map partage son identité géographique ;
- migrations séparées du code applicatif ;
- une responsabilité / une branche / une PR / un merge ;
- Builder ≠ Reviewer ≠ Release Certifier ;
- tests + preuves exact-head avant merge ;
- toute mutation avec rollback disponible avant activation.

# 3. Lane UX / Carte

Acquis :

- P1A.0 ✅ PR #327 ;
- P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — Search Geo Contract ;
- P1A.3 ✅ PR #349 — Map State & Navigation, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System technique ;
- P1A.5 ✅ PR #365 — Territorial Explorer progressif **Maroc → ville → quartier**, **9,3/10** ;
- P1A.6 ✅ PR #369 — Responsive Hardening, **12 captures / 0 finding**, **9,2/10** ;
- P1B.1 ✅ PR #371 — **AkarFinder Map Visual Layer**, **9,1/10** ;
- P1B.2 ✅ PR #376 — **Sourced Territorial Intelligence** `layer=price`, aucune interpolation/fallback ville, **9,2/10** ;
- P1B.3 ✅ PR #382 — **Territorial Metric Join Contract** ;
- P1B.4 ✅ PR #386 — **Geo Coverage Recovery pilot**.

## P1B.3 — Territorial Metric Join Contract ✅ CLOSED

Contrat :

`LISTING public/displayable → dernier événement geo explicite → resolved → quartier canonique validated → ville canonique validated`

Garde-fous certifiés : latest-event-first, même dénominateur public pour coverage/collisions, collisions latest avant collapse, conflits historiques séparés, aucun cast externe dangereux, aucune inférence quartier, aucune interpolation, aucun changement Search/ranking/display/publication/geometry, `metric_layers_activated=false`.

Preuve production initiale après merge `dca48b2c` :

- `eligible_public_listings = 15 399` ;
- `resolved_neighborhood_listings = 0` ;
- `coverage_percent = 0.00` ;
- `latest_resolution_collisions = 0` ;
- `conflicting_resolution_history = 0` ;
- `missing_canonical_geo = 0` ;
- `metric_layers_activated = false`.

Décision : **Geo Coverage Recovery obligatoire**, aucun choroplèthe Offre.

## P1B.4 — Geo Coverage Recovery pilot ✅ CLOSED

But : matérialiser une première cohorte quartier honnête à partir de données déjà persistées, sans inférence.

Contrat :

`LISTING public/displayable → coverage_bridge explicite → property_listings.district explicite → alias Geo Registry exact et unique → ville parente validated + alias ville exact → aucun événement geo préalable`

Interdits : fuzzy matching, titre, URL, coordonnées, proximité, interpolation, fallback ville présenté comme quartier.

Certification :

- base : `c036bb061ce4d083e264254387b8eac77f53b565` ;
- head revu : `c2f99d90406ad696c13456efe1e05baa7ea6dd41` ;
- PR #386 ;
- merge : `5ab84bcf4d76f6ddda5371ae3d35ffc3b7f01050` ;
- Reviewer : PASS après ajout obligatoire d’un test PostgreSQL apply/drift/rollback ;
- exact-head gate : `31254793603` ✅ ;
- post-merge gate : `31254967688`, job `93096902922` ✅ ;
- migration `p1b4_geo_coverage_recovery` appliquée en production ;
- preflight post-migration : **69 candidates / 69 seeds / 69 property listings / 14 quartiers / 5 villes** ;
- write transactionnel : **69/69** ;
- candidate set après write : **0** ;
- rollback append-only disponible, non requis ;
- aucun finding Supabase nouveau spécifique P1B.4.

Rapport P1B.3 après P1B.4 :

- `eligible_public_listings = 15 395` ;
- `resolved_neighborhood_listings = 69` ;
- `coverage_percent = 0.45` ;
- `latest_resolution_collisions = 0` ;
- `conflicting_resolution_history = 0` ;
- `missing_canonical_geo = 0` ;
- `metric_layers_activated = false`.

### Décision Carte actuelle

**0,45 % reste insuffisant pour activer une couche Offre par quartier.** Le prochain travail Carte doit poursuivre **Geo Coverage Recovery** à partir de preuves géographiques explicites/canoniques. Aucun seuil artificiel ni numéro de lot suivant n’est déclaré avant audit de la prochaine cohorte récupérable.

# 4. Fondation DATA acquise

Observation Ledger / Freshness / normalization / quality tiers ; Source Registry v2 / display eligibility ; Market Index / Property Graph foundation ; dedup ; Partner Feed ; OpenSERP / public sitemaps / Common Crawl ; 53 villes/pôles.

# 5. DATA-1 ✅

37 009 URLs / 7 051 domaines ; 8 727 registered domains Common Crawl ; univers 15 238 domaines ; 230 primary-source candidates ; 625 portal candidates ; Registry initial sans activation non autorisée.

# 6. DATA-4 — Reservoir Strategy

- **4.0 ✅ #341** — Avito+Mubawab : 35 134 normalized, 3 588 technical display, 0 policy-activable.
- **4.1A ✅ #343** — Avito unavailable : 95,06 % bruit ; 73 core-récupérables.
- **4.2 ✅ #344** — Dar Agadir = `ADMISSIBLE_GROWTH`; Agenz = `PARTNERSHIP_UPSIDE`.
- **4.3A → H ✅ jusqu’à #377** — Dar Agadir certifié au cap **500**, Search/display **500/500**, drift **0 %**.
- **4.3I ✅ #367** — protection multi-channel freshness ownership.
- **4.3J ✅ #368** — ordre du trigger display corrigé.
- **4.4A ✅ #379** — Promo Immo sélectionné `PREFERRED_PENDING_REVALIDATION`, 0 write.
- **4.4B ✅ #380**, merge `13b6c3c` — **3 130 URLs sitemap / 2 935 intersection / 2 456 éligibles**, canary 50 préparé, 0 write.
- **4.4C ✅ #384/#385** — protection freshness-only du Thin Index + canary persistant **50/50**, Search/display/quality/projection **50/50**, drift **0 %**, Registry inchangé ; Promo Immo **3 005 total / 59 fresh_confirmed / 2 946 seed_only / 50 sitemap-presence** ; rollback non requis.

## DATA-4.4C — Persistent Canary 50 ✅ CLOSED

Le canary exact est persistant et certifié en production. **4.4C n’autorise pas automatiquement +100/+500.** Toute expansion du second réservoir doit être définie comme un nouveau lot borné avec ses propres gates, preuves et rollback.

# 7. Lane business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.

# 8. Suite DATA

DATA-4.4C ✅ → **définir explicitement le prochain lot d’expansion bornée du second réservoir** → autres sources admissibles → DATA-3 connectors → DATA-5/6/7 feeds/claim/workspace → 20K → 50K → 100K+.

# 9. Définition de terminé

Scope respecté, Reviewer indépendant PASS, tests/build/gates exact-head verts, preuves, Registry respecté, aucun bypass, Release Certifier GO, PR mergée depuis le head attendu, `main` vérifié, post-merge CI/gates verts, production vérifiée si applicable, rollback disponible si mutation, 3 MD alignés.

# 10. Prochaine action exacte

## UX / Carte

Auditer la **prochaine cohorte de Geo Coverage Recovery** : mesurer les districts explicites persistés encore non résolus, les alias manquants/variantes canoniques et les bridges disponibles. N’ajouter au Geo Registry que des alias explicitement justifiés ; aucune déduction titre/URL/proximité. Tant que la couverture reste insuffisante, **Offre quartier = OFF**.

## DATA

**Définir explicitement le prochain lot d’expansion bornée du second réservoir** à partir du canary 50 certifié de DATA-4.4C. Aucun +100/+500 n’est autorisé par défaut.
