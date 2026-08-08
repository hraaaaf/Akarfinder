# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-08**  
**Statut : UX P1B.3 🔴 certification finale ; DATA-4.4B ✅ PR #380 ; DATA-4.4C = prochain lot DATA**

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
- mutation DATA : rollback avant activation.

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
- P1B.2 ✅ PR #376 — **Sourced Territorial Intelligence** `layer=price`, aucune interpolation/fallback ville, **9,2/10**.

## P1B.3 — Territorial Metric Join Contract 🔴 PR #382

But : déterminer si AkarFinder possède réellement un pont assez fiable entre l’inventaire public affichable et les quartiers canoniques avant d’afficher une couche **Offre** par quartier.

Contrat actuel :

`LISTING réel/displayable → dernier événement geo explicite → statut toujours resolved → quartier canonique validated → ville canonique validated`

Garde-fous :

- aucun quartier déduit d’un titre, d’une URL, d’une ville ou d’une proximité ;
- aucune interpolation spatiale ;
- dernier événement géographique autoritaire : une ancienne résolution n’est jamais ressuscitée après un événement `unresolved` ;
- couverture et collisions utilisent exactement le même dénominateur `real_estate_likely + LISTING + eligible_primary|eligible_secondary` ;
- collisions latest mesurées avant collapse ; conflits historiques reportés séparément ;
- aucune conversion non sûre de `source_record_id` vers UUID ;
- `metric_layers_activated=false` ;
- aucun changement Search, ranking, display eligibility, publication ou géométrie.

Historique de revue :

| Étape | État / preuve |
|---|---|
| Builder initial | ✅ migration fail-closed + tests |
| Reviewer pass #1 | **CHANGES_REQUIRED** — stale resolution + collision tautologique |
| Corrections | ✅ latest-event first + vraies collisions |
| Reviewer pass #2 | **CHANGES_REQUIRED** — collisions hors dénominateur public |
| Corrections | ✅ même dénominateur public |
| Reviewer pass #3 | **CHANGES_REQUIRED** — cast externe `source_record_id::uuid` non sûr |
| Corrections | ✅ comparaison sûre vers `seed_id::text` |
| Reviewer pass #4 | **CHANGES_REQUIRED** — absence de gate spécialisé exécutant le nouveau contrat |
| Corrections | ✅ test PostgreSQL/PGlite + workflow permanent |
| Reviewer final code | ✅ PASS sur head pré-docs ; nouvelle revue requise après closeout MD |
| PR | #382 |
| Specialized gate | ✅ `P1B.3 Territorial Metric Join Gate` run `31252849825` sur head pré-docs : static + PostgreSQL semantic + TypeScript verts |
| Exact-head CI final | 🔄 à relancer après alignement des 3 MD |
| Release Certifier | ⏳ |
| Merge / post-merge | ⏳ |
| Rapport production read-only | ⏳ après migration mergée |

Décision suivante, uniquement après rapport production :

- couverture quartier suffisante + `latest_resolution_collisions = 0` → prochain lot produit = **Offre — annonces affichables indexées** avec couleurs par quartier ;
- sinon → prochain lot = **Geo Coverage Recovery**, sans choroplèthe fabriqué.

Aucun seuil de couverture n’est inventé dans P1B.3 : la distribution réelle doit être observée et justifiée avant activation produit.

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
- **4.4B ✅ #380**, merge `13b6c3c` — source revalidée sur signaux publics actuels : **3 130 URLs sitemap**, **2 935** intersectent le réservoir, **2 456** lignes conservatrices éligibles ; canary préparé **50/50** pour Search, technical display, quality A/B et rollback ; **0 write**.

## DATA-4.4C — Persistent Canary 50 — PROCHAIN LOT DATA

Objectif : écriture transactionnelle réelle des **50** lignes certifiées par 4.4B, puis re-certification production.

Gates minimaux : preflight exact 50/50, transaction atomique, Search 50/50, technical display 50/50, qualité A/B préservée, drift ≤1 %, provenance intacte, rollback immédiat sur anomalie. Aucun passage à 100/500 avant certification persistante.

# 7. Lane business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.

# 8. Suite DATA

DATA-4.4C canary 50 persistant → re-certification → décision d’expansion bornée du second réservoir → autres sources admissibles → DATA-3 connectors → DATA-5/6/7 feeds/claim/workspace → 20K → 50K → 100K+.

# 9. Définition de terminé

Scope respecté, Reviewer indépendant PASS, tests/build/gates exact-head verts, preuves, Registry respecté, aucun bypass, Release Certifier GO, PR mergée depuis le head attendu, `main` vérifié, post-merge CI/gates verts, production vérifiée si applicable, rollback disponible si mutation, 3 MD alignés.

# 10. Prochaine action exacte

## UX / Carte

Finaliser **P1B.3** : revue du head incluant les 3 MD → exact-head CI → Certifier → merge → post-merge → appliquer/constater la migration en production → exécuter le rapport read-only → choisir mathématiquement entre couche Offre et Geo Coverage Recovery.

## DATA

**DATA-4.4C — Persistent Canary 50** : write transactionnel réel seulement dans son LOT dédié, sans le mélanger à P1B.3.
