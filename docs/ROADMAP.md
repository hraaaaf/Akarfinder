# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-08**  
**Statut : UX/Carte P1B.4 ✅ production certifiée ; BENCHMARK-SERP-1 ✅ first pass ; prochain lot UX Search = SEARCH-UX-FAST-1 ; couche Offre quartier OFF ; DATA-4.4C ✅ canary 50 persistant certifié**

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
- Builder ≠ Benchmark UX/Search Reviewer ≠ Reviewer technique ≠ Release Certifier ;
- tests + preuves exact-head avant merge ;
- mutation DATA : rollback avant activation ;
- mobile = expérience UX de référence ; aucun lot UX majeur certifié avec mobile <9/10 ;
- aucun jargon d’architecture interne exposé au grand public sans nécessité ;
- benchmark concurrent = source d’apprentissage, jamais modèle à copier.

# 3. Lane UX / Search

## BENCHMARK-SERP-1 ✅ FIRST PASS

Référence : `docs/BENCHMARK_SERP_1_REPORT.md`. Agent : `docs/BENCHMARK_UX_SEARCH_AGENT.md`.

Verdict : **CHANGES_REQUIRED** sur la SERP actuelle avant closeout UX Search.

Direction verrouillée :

`RECHERCHE → FILTRES COMPACTS → COMPTEUR/TRI → ANNONCE → ANNONCE → ANNONCE`

Scores heuristiques first pass : AkarFinder **6,9/10**, mobile **6,2/10**, desktop **7,2/10** ; potentiel après simplification **9,3–9,5/10**.

Décisions déjà verrouillées :

- flux visuel continu ;
- mobile comme référence ;
- desktop enrichit sans ajouter du bruit ;
- Benchmark Reviewer obligatoire avec pouvoir `CHANGES_REQUIRED` ;
- zéro jargon grand public ;
- card cible `IMAGE → PRIX → TITRE → LOCALISATION → 3–4 FACTS → PROVENANCE → ACTION`.

### SEARCH-UX-FAST-1 — PROCHAIN LOT UX SEARCH

Responsabilité unique : **réduire au strict minimum tout ce qui précède le premier résultat sur `/search`**, sans modifier ranking, récupération de prix, ordre commercial, structure des cards, DATA, Registry ou Map.

Objectif : après validation d’une recherche, l’utilisateur doit arriver immédiatement sur les résultats. Mobile 390 px est la référence ; desktop 1280/1440 doit rester au moins aussi lisible sans réintroduire de bruit.

Gates minimaux :

- audit avant/après du nombre d’éléments et de la distance verticale avant la première annonce ;
- captures 360/390/1280/1440 ;
- premier résultat visible dans le premier écran utile autant que les contraintes header/filtres le permettent ;
- aucun texte éditorial/promotionnel avant les résultats ;
- filtres essentiels conservés ;
- aucune régression Search fonctionnelle ;
- Benchmark Reviewer PASS avec mobile ≥9/10 ;
- Reviewer technique PASS ;
- Release Certifier GO ;
- 3 MD canoniques alignés au closeout.

Lots suivants, sans les mélanger : `SEARCH-WORDING-PURITY-1` → `SEARCH-CONTINUOUS-FLOW-1` → `PRICE-COVERAGE-RECOVERY-1` → `RANKING-QUALITY-1` → `UNIFIED-LISTING-CARD-1` → `CONTEXTUAL-VISUAL-ASSETS-1`.

# 4. Lane UX / Carte

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

Production initiale : **15 399 listings éligibles / 0 résolu / 0 % coverage / 0 collision / 0 conflit**, `metric_layers_activated=false`.

## P1B.4 — Geo Coverage Recovery pilot ✅ CLOSED

Preflight **69/69**, write **69/69**, **14 quartiers / 5 villes**, aucune inférence/fuzzy/spatiale. Rapport post-write : **15 395 listings éligibles / 69 résolus / 0,45 % coverage / 0 collision / 0 conflit**, `metric_layers_activated=false`.

**Offre quartier reste OFF.** La prochaine lane Carte poursuit la récupération géographique explicite/certifiable ; aucun seuil artificiel ni choroplèthe fabriqué.

# 5. Fondation DATA acquise

Observation Ledger / Freshness / normalization / quality tiers ; Source Registry v2 / display eligibility ; Market Index / Property Graph foundation ; dedup ; Partner Feed ; OpenSERP / public sitemaps / Common Crawl ; 53 villes/pôles.

# 6. DATA-1 ✅

37 009 URLs / 7 051 domaines ; 8 727 registered domains Common Crawl ; univers 15 238 domaines ; 230 primary-source candidates ; 625 portal candidates ; Registry initial sans activation non autorisée.

# 7. DATA-4 — Reservoir Strategy

- 4.0 ✅ #341 — Avito+Mubawab : 35 134 normalized, 3 588 technical display, 0 policy-activable ;
- 4.1A ✅ #343 — Avito unavailable : 95,06 % bruit ; 73 core-récupérables ;
- 4.2 ✅ #344 — Dar Agadir = `ADMISSIBLE_GROWTH`; Agenz = `PARTNERSHIP_UPSIDE` ;
- 4.3A→J ✅ — Dar Agadir 500/500, Search/display 500/500, drift 0 %, ownership fraîcheur et trigger display protégés ;
- 4.4A ✅ #379 ;
- 4.4B ✅ #380 — Promo Immo revalidé : 3 130 URLs sitemap / 2 935 intersection / 2 456 éligibles ;
- 4.4C ✅ #384, merge `ba65943a` — canary 50 persistant certifié, Search/display/quality/projection **50/50**, drift **0 %**, Registry inchangé.

DATA-4.4C n’autorise aucun +100/+500 automatique. Le prochain lot DATA d’expansion doit être borné explicitement.

# 8. Lane business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.

# 9. Définition de terminé

Scope respecté, Benchmark Reviewer si UX majeur, Reviewer indépendant PASS, tests/build/gates exact-head verts, preuves, Registry respecté, aucun bypass, Release Certifier GO, PR mergée depuis le head attendu, `main` vérifié, post-merge CI/gates verts, production vérifiée si applicable, rollback disponible si mutation, 3 MD alignés.

# 10. Prochaine action exacte

## UX / Search

Exécuter **SEARCH-UX-FAST-1** uniquement : réduire la distance jusqu’au premier résultat sans toucher au ranking, aux cards, au prix ou aux règles commerciales.

## UX / Carte

Auditer la prochaine cohorte explicite de Geo Coverage Recovery. Tant que couverture insuffisante : **Offre quartier = OFF**.

## DATA

Définir explicitement le prochain lot d’expansion bornée à partir du canary 50 certifié. Aucun +100/+500 par défaut.
