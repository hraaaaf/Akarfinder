# DATA-4.1A — Avito Internal Reservoir Recovery Audit

Status: **read-only implementation**.

Ce document est une spécification/preuve technique subordonnée à `docs/ROADMAP.md`.

## Objectif

Expliquer les lignes Avito déjà présentes dans AkarFinder avec `normalization_status=unavailable`, sans effectuer aucune nouvelle observation réseau.

Contrat :

`EXISTING AVITO RESERVOIR → CANONICAL VERTICAL FILTER → EXISTING SIGNALS → RECOVERY CLASS → INTERNAL-ONLY DECISION`

DATA-4.1A ne répare rien en base. Il mesure seulement ce qui est réellement récupérable avec les données déjà détenues.

## Point de départ DATA-4.0

DATA-4.0 / PR #341 a certifié :

- Avito normalized rows : **23 925** ;
- `normalization_status=unavailable` : **22 227** ;
- technical display-eligible : **231** ;
- policy-activable : **0** ;
- fresh-confirmed : **10**.

La première hypothèse « 22K annonces immobilières à récupérer » est donc testée explicitement, pas supposée vraie.

## Census read-only préalable

Les requêtes production effectuées avant implémentation ont montré :

- les **22 227 / 22 227** lignes `unavailable` proviennent de `commoncrawl_cdx` ;
- les 22 227 URLs matchent un pattern de détail et ont été observées principalement en HTTP 200 dans Common Crawl ;
- mais la majorité appartient à des catégories Avito hors immobilier : voitures, informatique, téléphones, gaming, etc.

AkarFinder possède déjà une table canonique `source_vertical_category_rules` pour Avito. DATA-4.1A la réutilise au lieu de créer une nouvelle taxonomie.

Règles Avito `real_estate_likely` existantes :

- `appartements` ;
- `locations_de_vacances` ;
- `terrains_et_fermes` ;
- `villas_et_riads` ;
- `local` ;
- `bureaux` ;
- `autre_immobilier` ;
- `maisons` ;
- `colocations` ;
- `maisons_et_villas` ;
- `chambre`.

Sur le snapshot production préalable :

- unavailable total : **22 227** ;
- catégories immobilières canoniques : **1 098** ;
- hors immobilier / hors règles : **21 129** ;
- part immobilière : **4,94 %** ;
- bruit/non-immobilier : **95,06 %**.

Le principal résultat de DATA-4.1 est donc une correction de vérité du reservoir : **22 227 unavailable ≠ 22 227 annonces immobilières perdues**.

## Signaux déjà disponibles dans les 1 098 lignes immobilières

Census préalable :

- property type déjà présent : **859** ;
- intent déjà présent : **364** ;
- location slug avec match exact Geo Alias : **253** ;
- type + intent : **330** ;
- type + geo : **202** ;
- intent + geo : **80** ;
- type + intent + geo : **71** ;
- stored title : **1** ;
- stored snippet : **1** ;
- price : **0** ;
- surface : **0** ;
- discovery overlap : **1** ;
- observation-history overlap : **0** ;
- raw-listing overlap : **0**.

Ces chiffres sont des observations pré-implémentation. L’artefact CI live est l’autorité finale du lot et peut évoluer si la base change.

## Classes DATA-4.1A

### `NOISE_OR_NON_LISTING`

La catégorie URL n’est pas dans `source_vertical_category_rules` en `real_estate_likely`.

Une ancienne heuristique lexicale qui aurait produit `property_type=riad`, `land`, etc. ne peut pas annuler cette décision verticale canonique.

### `RECOVERABLE_FROM_EXISTING_DATA`

Conditions conservatrices :

- catégorie immobilière canonique ;
- property type déjà présent ;
- intent déjà présent ;
- city déjà présente **ou** location slug correspondant exactement, après normalisation déterministe, à un alias du Geo Registry.

Cette classe signifie seulement **core fields récupérables pour travail interne**.

Elle ne signifie ni fiche complète, ni comparable, ni résultat public. Price/surface/title peuvent rester absents.

### `INSUFFICIENT_EXISTING_EVIDENCE`

Catégorie immobilière canonique, mais le jeu de signaux existants ne suffit pas à satisfaire la condition core ci-dessus.

Une nouvelle observation pourrait théoriquement apporter plus d’information, mais DATA-4.1A n’en effectue aucune et ne modifie aucune policy.

## Boundary Source Registry

Avito reste actuellement :

- `authorization_status=unverified` ;
- `acquisition_mode=public_index_internal_only` ;
- `detail_fetch_policy=legal_review_required` ;
- `display_policy=internal_signal_only` ;
- `display_gate=hidden`.

Par conséquent :

- `policyActivableRows = 0` ;
- toute ligne real-estate/core-recoverable reste internal-only ;
- aucun recovery interne ne peut être présenté comme nouvel inventaire public.

Le moteur DATA-4.1A échoue explicitement si le Registry devient public-activable : une nouvelle revue du lot serait alors nécessaire.

## Implémentation

Fichiers :

- `scripts/data4/avito-internal-recovery-audit.ts` — moteur déterministe ;
- `scripts/data4/__tests__/avito-internal-recovery-audit.test.ts` — tests truth/fail-closed ;
- `scripts/audits/data-4-1-avito-internal-recovery-audit.ts` — runner Supabase read-only paginé ;
- `.github/workflows/data-4-1-avito-internal-recovery-audit.yml` — contract + preuve live.

Le runner lit uniquement :

- `thin_index_normalized_documents_v2` ;
- `source_vertical_category_rules` ;
- `geo_aliases` ;
- `source_policy_registry`.

Il ne contacte **jamais Avito**.

## Outputs

- `report.json` ;
- `report.md` ;
- `proof.json` ;
- `categories.csv` ;
- `classification.csv`.

## Gates

CI échoue si :

- read-only != true ;
- DB write != 0 ;
- policy change != 0 ;
- source network request != 0 ;
- policy-activable rows != 0 ;
- conservation de lignes impossible ;
- recovery core > sous-ensemble immobilier ;
- contamination du reservoir n’est plus explicitement visible ;
- Registry Avito n’est plus `hidden/internal_signal_only`.

## Non-goals

- aucun fetch Avito ;
- aucune traversal sitemap ;
- aucun WARC ;
- aucun scraping ;
- aucune mutation Supabase ;
- aucun rewrite du normaliseur ;
- aucune activation ;
- aucune publication.

## Décision après DATA-4.1A

Si le live audit confirme qu’un petit sous-ensemble est récupérable de façon déterministe :

1. définir un lot distinct **DATA-4.1B Shadow Recovery** ;
2. appliquer seulement aux catégories immobilières canoniques ;
3. exclure le bruit/non-immobilier ;
4. produire avant/après en shadow ;
5. canary et certification avant tout write production ;
6. conserver Avito internal-only tant que la policy ne change pas explicitement.
