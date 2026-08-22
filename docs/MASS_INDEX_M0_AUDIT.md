# DATA MASS-INDEX — M0 current-main + Supabase audit

**Date : 2026-08-22**  
**Mode : READ-ONLY**  
**Supabase : `akar` / `kusfiyimwvxblvsrhaes`**  
**Git baseline initiale : `main@f0293bb446e2e5779fb67181cd504d71dd1d0138`**

## Goal
Mesurer l'état réel du stock, du read-model et du pipeline avant toute mutation MASS-INDEX.

## Succès
Baseline reproductible par canal/source/ville/fraîcheur, inventaire des chemins de promotion/indexation, delta vs MASS-6 historique et identification du goulot principal.

## Preuve
Toutes les métriques DB ci-dessous proviennent de requêtes SQL read-only exécutées le 2026-08-22. Aucun writer, migration, scraper, réseau source ou déploiement Vercel n'a été lancé pendant M0.

## 1. Stock live

| Surface | Valeur |
|---|---:|
| `discovery_candidates` rows | 272 437 |
| canonical URLs distinctes | 135 754 |
| source domains observés | 22 005 |
| candidates avec title | 261 275 |
| candidates avec snippet | 259 553 |
| vus <= 7 jours | 45 354 |
| vus <= 30 jours | 246 894 |
| `thin_index_search_documents` | 56 861 |
| `LISTING + real_estate_likely` | 15 546 |
| `property_listings` | 5 700 |
| `listing_sources` | 5 705 |
| `property_clusters` | 5 561 |
| `property_cluster_members` | 5 561 |
| `source_offer_observations` | 4 461 |
| `source_offer_seeds` | 56 861 |
| `source_policy_registry` | 35 |
| `source_freshness_state` | 16 |

`source domains observés=22 005` est un univers discovery bruité et ne doit pas être interprété comme 22 005 portails immobiliers.

## 2. Delta vs MASS-6 historique

Baseline MASS-6 : 209 109 discovery rows et 104 584 URL representations distinctes.

- discovery rows : **+63 328**, soit **+30,28 %** ;
- canonical URLs distinctes : **+31 170**, soit **+29,80 %**.

Le réservoir a donc continué de croître. Le problème principal n'est pas la pénurie d'URLs découvertes.

## 3. Discovery par canal

| Canal | Rows | URLs distinctes |
|---|---:|---:|
| OpenSERP | 245 177 | 118 183 |
| Serper MASS harvest | 16 098 | 7 596 |
| public sitemap | 11 162 | 11 162 |

## 4. Sources prioritaires — discovery live

| Domaine | Rows | Last seen |
|---|---:|---|
| mubawab.ma | 14 467 | 2026-08-22 |
| agenz.ma | 12 523 | 2026-08-22 |
| avito.ma | 11 635 | 2026-08-22 |
| daragadir.com | 6 184 | 2026-08-15 |
| masaken.ma | 4 960 | 2026-08-22 |
| mouldar.com | 4 613 | 2026-08-21 |
| marocannonces.com | 4 283 | 2026-08-20 |
| promoimmomarrakech.com | 3 589 | 2026-08-16 |
| sakane.ma | 1 853 | 2026-08-20 |
| yakeey.com | 1 419 | 2026-08-17 |
| 2p.ma | 1 115 | 2026-08-21 |
| portail-immobilier.ma | 931 | 2026-08-21 |
| 1000-annonces.com | 836 | 2026-08-22 |
| housing.place | 612 | 2026-08-16 |
| expat.com | 492 | 2026-08-19 |
| domio.ma | 468 | 2026-08-20 |
| milkiya.ma | 297 | 2026-08-16 |

Une agrégation globale coûteuse `GROUP BY source_domain ORDER BY count(distinct canonical_url)` a dépassé le timeout PostgreSQL. Elle n'a pas été répétée ; l'audit est passé à la cohorte prioritaire ciblée.

## 5. Thin Index : qualité et enrichissement

Sur 56 861 documents :

- 34 172 = `real_estate_likely` ;
- 15 546 = `document_kind=LISTING` + `real_estate_likely` ;
- 23 515 ont une ville normalisée ;
- 29 793 un type ;
- 26 145 une intention ;
- 3 158 un prix ;
- 2 549 une surface ;
- 880 ont prix + surface.

Display eligibility globale :

- `eligible_primary` : 10 366 ;
- `eligible_secondary` : 11 537 ;
- `ineligible` : 34 958.

Pour les 15 546 LISTING immobilières :

| Provider | primary | secondary | ineligible |
|---|---:|---:|---:|
| public_sitemap | 7 443 | 506 | 108 |
| commoncrawl_cdx | 469 | 4 564 | 0 |
| serper_search | 2 454 | 2 | 0 |

Le RPC public courant `search_public_representations_v2()` retourne **15 425 représentations recherchables** sans filtre.

## 6. Couverture villes — LISTING immobilières

| Ville | Listings |
|---|---:|
| Agadir | 6 160 |
| Marrakech | 3 535 |
| Casablanca | 2 196 |
| Rabat | 984 |
| Tanger | 907 |
| Fès | 383 |
| Kénitra | 323 |
| Mohammedia | 169 |
| Salé | 154 |
| Témara | 144 |
| El Jadida | 126 |
| Oujda | 113 |
| Meknès | 112 |
| Safi | 69 |
| Tétouan | 39 |
| Berrechid | 36 |
| Essaouira | 27 |
| Nador | 25 |
| Dakhla | 18 |
| Settat | 11 |

Conclusion : couverture très déséquilibrée, notamment Agadir/Marrakech surpondérées par certaines sources.

## 7. Top sources déjà classifiées LISTING

| Domaine | Listings | Prix | Surface |
|---|---:|---:|---:|
| daragadir.com | 5 566 | 1 660 | 3 |
| agenz.ma | 3 813 | 583 | 1 112 |
| promoimmomarrakech.com | 2 492 | 0 | 3 |
| mubawab.ma | 1 375 | 269 | 546 |
| mouldar.com | 1 289 | 92 | 205 |
| masaken.ma | 754 | 410 | 96 |
| 1immo.ma | 128 | 101 | 42 |
| avito.ma | 94 | 0 | 1 |
| marrakechrealty.com | 35 | 0 | 35 |

## 8. Pipeline code présent sur current-main

Le repo conserve déjà l'essentiel de la machinerie MASS :

- `scripts/data-mass/candidate-promotion.ts` ;
- `mass-reclassification-live.ts` ;
- `reservoir-qualification.ts` ;
- `source-factory-certified-cohort.ts` ;
- `national-mass-engine-live.ts` ;
- `minimal-listing-index-policy.ts` ;
- `minimal-listing-projection.ts` ;
- `scripts/ingest-openserp-listings.ts` ;
- `scripts/public-index/*` ;
- `scripts/recrawl/*` ;
- `scripts/scrapers/*` ;
- normalizers, DB writers, freshness, dedup et Search gateway existants.

### Blocage historique exact

`candidate-promotion.ts` ne marque admissible que la queue `POLICY_COMPATIBLE_TAIL`; le reste devient `POLICY_BLOCKED`.

`minimal-listing-index-policy.ts` exige un chemin policy positif et non expiré avant de construire une représentation minimale.

`national-mass-engine-live.ts` a été conçu pour considérer `POLICY` comme frontière attendue lorsque `policyAdmissibleRegistryRows=0`.

Ces comportements expliquent le gel historique du passage discovery -> index.

## 9. Search live réel

`/api/search` passe par `routePublicSearch`, puis `searchPublicRepresentationsWithOwner`, puis `searchPublicRepresentations`.

Le read-model public réel utilise le RPC Supabase `search_public_representations_v2`, qui lit `thin_index_search_documents` et impose notamment :

- `document_kind='LISTING'` ;
- `display_eligibility in ('eligible_primary','eligible_secondary')` ;
- provider autorisé ;
- freshness `seed_only` ou `fresh_confirmed` ;
- dédup exacte par canonical URL ;
- filtres ville/type/intention/prix/surface.

Donc le chemin le plus court vers davantage de biens visibles est **d'augmenter correctement `thin_index_search_documents` éligibles**, pas de créer immédiatement un deuxième moteur Search.

## 10. Public Property Index POC

Le repo contient un `SupabasePublicPropertyIndexStore` destiné à la table `public_property_index`, avec upsert/search et fallback silencieux si table absente.

**DB live : `public.public_property_index` n'existe pas** (`42P01`).

Conséquence : ce POC n'est pas le read-model live et ne doit pas être pris comme raccourci M1. Il pourra être supprimé, migré ou réconcilié en M2 selon la solution retenue.

## 11. Diagnostic M0

### Fait vérifié
135 754 URLs canoniques sont déjà découvertes, mais seulement 15 546 sont classifiées comme LISTING immobilières et 15 425 sont actuellement recherchables via le RPC public.

### Goulot principal
**candidate -> classification/promotion -> display eligibility**, puis enrichissement sparse des champs structurés.

### Goulot secondaire
Dédup propriété réelle : 5 561 clusters pour 5 700 `property_listings`, alors que les 15 425 représentations publiques ne sont aujourd'hui dédupliquées que par URL exacte dans le RPC.

### Recommandation
M1 doit promouvoir le stock discovery existant vers le Thin Index externe minimal de façon déterministe, sans exiger prix/surface/photo/description. M2 renforcera ensuite le modèle externe/provenance si nécessaire. M3/M4 enrichiront source par source.

## 12. M1 — contrat d'entrée

M1 doit :

1. lire `discovery_candidates` ;
2. canonicaliser + dédupliquer URL ;
3. classifier `real_estate_likely` + `document_kind=LISTING` ;
4. produire une représentation minimale avec `canonical_url`, `source_domain`, titre/signal structurel, provider, timestamps et provenance ;
5. **ne pas exiger** prix/surface/photo/description ;
6. écrire d'abord en dry-run/manifest déterministe ;
7. mesurer `candidate -> accepted -> rejected` par raison et domaine ;
8. seulement ensuite effectuer un micro-write borné et idempotent ;
9. préserver les protections techniques et ne copier aucun contenu riche par défaut.

## Verdict M0

**PASS.** Baseline fraîche obtenue, pipeline inventorié, read-model live identifié, blocage historique localisé et Next M1 défini. Aucune mutation DB.
