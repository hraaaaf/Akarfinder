# AKARFINDER — P6 MARKET MEMORY

Date: 2026-09-06
Branch: `feat/mubawab-full-enumeration`

## Goal
Transformer le corpus Mubawab historique en mémoire immobilière interne exploitable sans confondre provenance historique, activité actuelle et donnée économique observée.

## Doctrine
- historique ≠ actif
- provenance structurée ≠ historique de prix
- aucune valeur économique n'est inventée
- aucune donnée de mémoire historique ne devient publiable par ce lot
- `source_policy_registry` reste souverain

## Entrée certifiée
- corpus Mubawab total : **37 420** IDs
- `current_verified` : **18 445**
- `historical_unverified` : **18 975**
- historiques classiques structurées V2.3 : **18 207**
- historiques office/category : **768**
- provenance manquante après V2.3 : **0**

# P6-A — Market Memory Index

## Exécution
`metadata.market_memory_v1` est renseigné sur **18 975 / 18 975** historiques.

Champs internes stockés :
- `version=market_memory_v1`
- `memory_status`
- `city` quand prouvée
- `property_family`
- `transaction_type`
- `provenance_kind`
- `last_evidence_at`
- `internal_quality_score`
- `structural_comparable_ready`
- `economic_comparable_ready`
- `price_history_ready`
- `publication_eligible=false`
- `public_status=internal_only`

## Distribution
- `structural_comparable_ready` : **18 207**
  - ville + famille de bien + transaction connues via preuve first-party structurée
- `category_memory_only` : **768**
  - famille `office_commercial` + transaction connues
  - ville non prouvée dans la preuve source, donc laissée inconnue

## Contrôles P6-A
- historiques indexées mémoire : **18 975 / 18 975**
- `current_verified` polluées par `market_memory_v1` : **0**
- `publication_eligible=true` sur historique : **0**
- dérive `updated_at` pendant la matérialisation : **0**
- aucun changement `freshness_status`
- aucun changement `evidence_status`

## Premiers segments structurels volumineux
- Rabat / appartement / location : **1 192**
- Marrakech / appartement / location : **1 061**
- Marrakech / villa / vente : **1 055**
- Marrakech / appartement / vente : **994**
- Tanger / appartement / location : **954**
- Casablanca / appartement / location : **948**
- Tanger / appartement / vente : **887**
- Marrakech / terrain / vente : **883**
- Casablanca / appartement / vente : **759**
- Casablanca / commercial / location : **686**

Ces volumes mesurent la mémoire de présence observée dans les surfaces historiques certifiées. Ils ne sont pas présentés comme stock actif ni comme parts de marché actuelles.

# P6-B — Trusted Economic Memory

## Goal
Faire monter `economic_comparable_ready` uniquement lorsqu'une annonce historique possède une preuve économique structurée, déterministe et auditée.

## Audit shadow
Croisement des **18 975** historiques avec `thin_index_search_documents` par ID Mubawab extrait de l'URL détail :
- historiques retrouvées dans le thin-index : **2 027**
- prix MAD normalisé disponible : **73**
- surface normalisée disponible : **115**
- prix + surface présents simultanément : **45**

Un simple couple prix+surface n'est pas suffisant.

## Gate économique strict v1
Pour devenir `economic_comparable_ready=true` :
- `normalization_status=normalized`
- `quality_tier=A`
- `normalized_price_mad` présent
- `normalized_surface_m2` présent
- preuve prix explicite (`bounded_mad_v2` ou `price_mad` explicite)
- `price_to_verify != true`
- `price_suppressed != true`
- aucune donnée inventée depuis un snippet ambigu

Résultat : **8 / 45** candidats passent le gate.
Les **37 autres restent exclus** de la mémoire économique.

## Matérialisation P6-B
Pour les 8 lignes qualifiées, `metadata.market_memory_v1` contient désormais :
- `economic_comparable_ready=true`
- `price_history_ready=false`
- `economic_gate_version=market_memory_economic_gate_v1`
- `economic_snapshot.price_mad`
- `economic_snapshot.surface_m2`
- `economic_snapshot.price_per_m2_mad` dérivé uniquement du prix et de la surface validés
- `economic_snapshot.observed_at`
- statut/version de normalisation
- qualité A + score
- méthode de preuve prix/surface
- version de réconciliation prix
- `method=trusted_thin_index_economic_snapshot_v1`

Les 8 snapshots qualifiés couvrent :
- Rabat / villa / location : 45 000 MAD, 800 m²
- Casablanca / commercial / vente : 1 620 000 MAD, 180 m²
- Marrakech / appartement / vente : 2 500 000 MAD, 146 m²
- Marrakech / terrain / vente : 1 450 000 MAD, 304 m²
- Casablanca / villa / location : 35 000 MAD, 600 m²
- Marrakech / villa / vente : 3 210 000 MAD, 243 m²
- Marrakech / villa / vente : 6 500 000 MAD, 200 m²
- Rabat / appartement / location : 11 500 MAD, 98 m²

Ces valeurs sont des snapshots historiques internes, pas des références de marché publiables.

## Pourquoi `price_history_ready` reste à 0
Un snapshot économique unique ne constitue pas une série temporelle.

État actuel :
- `economic_comparable_ready=true` : **8**
- `price_history_ready=true` : **0**

Aucune table `price_m2_references` n'est alimentée à partir de cet échantillon : **8 observations isolées sont insuffisantes pour fabriquer une référence statistique robuste**.

## Succès P6
- mémoire structurelle : **18 975 / 18 975** indexées
- comparables structurels géolocalisés : **18 207**
- mémoire catégorie sans ville prouvée : **768**
- snapshots économiques strictement qualifiés : **8**
- séries historiques de prix qualifiées : **0**
- publication supplémentaire : **0**
- aucun merge
- aucun déploiement Vercel

## Prochain lot P6-C
Construire une vraie dimension temporelle sans crawl interdit :
- rechercher des réobservations datées persistées par moteurs/index externes autorisés ;
- relier plusieurs snapshots économiques du même ID lorsqu'ils sont déterministes ;
- seulement à partir de >=2 observations économiques datées compatibles, ouvrir `price_history_ready` ;
- ne produire aucune référence prix/m² de ville/type tant que le sample et les contrôles d'outliers ne sont pas suffisants.

P6-C reste shadow/internal jusqu'à certification explicite.
