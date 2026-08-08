# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-08**  
**Statut : UX P1B.2 ✅ PR #376 ; prochain lot UX après audit métriques ; DATA-4.3H ✅ ; DATA-4.4A 🔴 qualification second réservoir**

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
- tests + preuves avant merge ;
- mutation DATA : rollback avant activation.

# 3. Lane UX

Acquis :

- P1A.0 ✅ PR #327 ;
- P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — Search Geo Contract ;
- P1A.3 ✅ PR #349 — Map State & Navigation, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System technique, cockpit flottant map-first ;
- P1A.5 ✅ PR #365 — Territorial Explorer progressif **Maroc → ville → quartier**, Geo Registry + canonical neighborhood data uniquement, URL/Search contracts préservés, responsive **390 / 430×932 / 768 / 1280**, **9,3/10** ;
- P1A.6 ✅ PR #369 — Responsive Hardening : contrôles tactiles/clavier renforcés, audit natif en viewport réel sur `/map`, `Rabat`, `Rabat/Agdal`, **12 captures / 0 finding**, **21/21 tests**, TypeScript/build/gates verts, défaut cockpit↔explorer détecté puis corrigé, score final **9,2/10** ;
- P1B.1 ✅ PR #371 — **AkarFinder Map Visual Layer** : basemap OpenFreeMap/CARTO fortement atténuée, couche territoriale propriétaire MapLibre, 16 arrondissements Casablanca issus exclusivement du dataset OSM shadow existant, palette différenciée mais non sémantique, contours/labels AkarFinder, activation uniquement via le preview-canary protégé, production toujours bloquée par le contrat géométrique, audit natif **430 / 768 / 1280 = 3 captures / 0 finding**, **21/21 tests**, TypeScript/build et gates finaux verts, score humain **9,1/10** ;
- P1B.2 ✅ PR #376 — **Sourced Territorial Intelligence** : état URL canonique `layer=price`, benchmarks quartier exacts uniquement pour appartement/achat, identité Geo Registry utilisée pour les aliases, médiane + fourchette + échantillon + confiance + période visibles, aucun fallback ville présenté comme prix quartier, aucune interpolation/heatmap/propagation du prix aux polygones, couche P1B.1 conservée et atténuée en mode prix, audit final **430 / 768 / 1280 = 3 captures / 0 finding**, tous les workflows du head verts, score humain **9,2/10**.

## Prochain lot UX — audit préalable obligatoire

Avant de définir un nouveau numéro de lot, auditer les métriques réellement calculables à la même granularité que les entités géographiques affichées.

Candidats à vérifier :

1. **offre disponible** — nombre réel d’annonces canoniques/displayables par ville/quartier ;
2. **fraîcheur** — part ou compte d’observations avec preuve de fraîcheur encore valide ;
3. **confiance DATA** — uniquement si le score repose sur des champs audités et explicables ;
4. **prix observés** — extension du mode P1B.2 uniquement aux quartiers/type/transaction disposant d’un benchmark exact ;
5. aucun mode ne devient canonique si sa granularité, sa provenance ou son dénominateur ne sont pas prouvés.

Règles de décision :

- pas de donnée = état neutre/indisponible ;
- aucune interpolation pour remplir visuellement la carte ;
- aucune agrégation ville présentée comme quartier ;
- aucune géométrie shadow promue implicitement ;
- 430×932 obligatoire ;
- score UX/UI ≥9/10 avant fermeture.

# 4. Fondation DATA acquise

Observation Ledger / Freshness / normalization / quality tiers ; Source Registry v2 / display eligibility ; Market Index / Property Graph foundation ; dedup ; Partner Feed ; OpenSERP / public sitemaps / Common Crawl ; 53 villes/pôles.

# 5. DATA-1 ✅

37 009 URLs / 7 051 domaines ; 8 727 registered domains Common Crawl ; univers 15 238 domaines ; 230 primary-source candidates ; 625 portal candidates ; Registry initial sans activation non autorisée.

# 6. DATA-4 — Reservoir Strategy

- **4.0 ✅ #341** — Avito+Mubawab : 35 134 normalized, 3 588 technical display, 0 policy-activable.
- **4.1A ✅ #343** — Avito unavailable : 95,06 % bruit ; 73 core-récupérables ; 0 policy-activable.
- **4.2 ✅ #344** — Dar Agadir = `ADMISSIBLE_GROWTH`; Agenz = `PARTNERSHIP_UPSIDE`.
- **4.3A → H ✅ #347/#348/#351/#353/#355/#358/#362/#364 + #372/#373/#375/#377** — expansion Dar Agadir exécutée et certifiée jusqu’au cap obligatoire de **500 lignes persistantes contrôlées** : `50 + 100 + 100 + 100 + 100 + 50`, max **100/run**, TTL **14 jours**, Registry+sitemap revalidés, snapshots/rollback, checkpoints fail-closed, Search/display mesurés avant/après.
- **4.3H certification production finale ✅ 2026-08-08** — Dar Agadir : **6 533 total**, **605 fresh_confirmed**, **5 928 seed_only**, **502** `public_sitemap_presence` globales ; cohorte contrôlée **500/500 fresh+sitemap**, Public Search **500/500**, technical display **500/500**, drift **0 %**, Registry inchangé, aucun rollback nécessaire.
- **4.3I ✅ #367** — protection multi-channel freshness ownership.
- **4.3J ✅ #368** — correction migration-only de l’ordre du trigger display.

## DATA-4.4 — Second Reservoir Expansion 🔴 ACTUEL

Objectif : reproduire le modèle Dar Agadir sur un second réservoir à fort rendement, sans relâcher les contraintes Registry, fraîcheur, qualité, déduplication et vérité publique.

### DATA-4.4A — Second Reservoir Qualification 🔴

Qualification **read-only** des sources déjà compatibles avec une lane sitemap/canonical-link.

Snapshot production :

| Source | Lignes | Normalized OK | Technical display | Fresh | Seed only | City | Type | Intent | Review |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `promoimmomarrakech.com` | **3 005** | **3 000** | **2 923** | 9 | **2 996** | **3 005** | 2 556 | **2 905** | due_soon |
| `limmobiliersansfrontieres.com` | 1 414 | 563 | 573 | 94 | 1 320 | 607 | 1 107 | 1 068 | due_soon |
| `atlasimmobilier.com` | 793 | 414 | 420 | 2 | 791 | 445 | 558 | 70 | due_soon |
| `aykana.ma` | 647 | 467 | 472 | 62 | 585 | 486 | 507 | 534 | due_soon |

Décision déterministe : **`promoimmomarrakech.com` = `PREFERRED_PENDING_REVALIDATION`**.

Pourquoi : plus grand réservoir, quasi-totalité normalisée, très forte présence technical display, couverture ville/intention élevée et Registry déjà structurée `public_sitemap_canonical_link / public_sitemap_only / canonical_link_only / external_tail_link_only`.

**Qualification ≠ activation.** Aucun write freshness, aucun changement Registry, aucune modification de display/publication policy sous 4.4A.

Exit 4.4A : scorer testé + live audit DB read-only + preuve CI + 3 MD alignés + PR mergée.

### DATA-4.4B — Source Revalidation + Canary 50 ⏭️

Après 4.4A uniquement :

1. revalidation Registry fraîche ;
2. `robots.txt` + déclaration sitemap publics actuels ;
3. sitemap same-origin + population actuelle ;
4. intersection sitemap ↔ normalized ;
5. audit bruit/qualité ;
6. risque duplicates/collisions Property Graph ;
7. mesure Search/display avant write ;
8. snapshot + rollback exacts ;
9. **premier canary max 50 lignes** ;
10. drift max **1 %**, fail-closed ;
11. aucune réutilisation de contenu/image et aucun detail-page fetch.

Aucun passage à 100/500 n’est autorisé tant que le canary 50 n’est pas certifié persistant.

# 7. Lane business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.

# 8. Suite DATA

DATA-4.4A qualification → DATA-4.4B canary 50 → certification → expansion bornée éventuelle du second réservoir → autres sources admissibles → DATA-3 connectors → DATA-5/6/7 feeds/claim/workspace → 20K → 50K → 100K+.

# 9. Définition de terminé

Scope respecté, tests/build/gates verts, preuves, Registry respecté, aucun bypass, PR mergée, prod vérifiée si write, rollback disponible, 3 MD alignés.

# 10. Prochaine action exacte

## DATA

Fermer **DATA-4.4A** en prouvant de manière read-only que `promoimmomarrakech.com` reste le meilleur second réservoir sous les métriques et le Registry actuels. Ensuite seulement lancer **DATA-4.4B** pour revalidation externe et canary 50.

## UX

Auditer le repo et les contrats DATA pour déterminer quelles métriques spatiales possèdent une **granularité territoriale exacte, une provenance explicable et un dénominateur stable**. Définir le prochain lot UX uniquement après ce résultat ; ne pas créer un faux choroplèthe d’offre, fraîcheur ou confiance.
