# AkarFinder — DATA Funnel Truth Pre-Audit Live

**Date : 2026-07-23**  
**Mode : Supabase Production READ-ONLY**  
**Aucun write, aucune migration, aucun changement runtime, aucun Vercel.**

## 1. Snapshot DB réel

| Population | Count |
|---|---:|
| `source_offer_seeds` | 21,946 |
| `discovery_candidates` | 14,720 |
| `property_listings` | 869 |
| `listing_sources` | 874 |
| `property_clusters` | 730 |
| `property_cluster_members` | 730 |
| `source_offer_observations` | 0 |

Seeds :

- `public_sitemap` : 11,420
- `commoncrawl_cdx` : 10,526
- `seed_only` : 21,889
- `fresh_confirmed` : 57

Discovery candidates :

- accepted : 585
- unclassified : 6,013
- rejected : 8,122

---

## 2. Correction méthodologique importante — accepted ↔ persisted

Une première comparaison exploratoire avait comparé :

- `discovery_candidates.canonical_url`
- avec `coalesce(listing_sources.source_url, listing_sources.listing_url)`.

Cette comparaison était incorrecte car le writer stocke :

- `listing_sources.listing_url` = URL canonique ;
- `listing_sources.source_url` = URL originale.

La comparaison canonique correcte donne :

- accepted URLs uniques : **559**
- overlap exact `listing_sources.listing_url` : **546**
- accepted réellement non persistées : **13**

Donc il n'existe **pas** de pool caché de 307 accepted non persistées.

Le chiffre exploratoire `307` est invalidé et ne doit plus être utilisé.

### 13 accepted réellement non persistées

Répartition :

- Mubawab : 5
- Souk Immobilier : 4
- 1immo : 2
- Avito : 1
- Sarouty : 1

Confidence :

- 3 Mubawab en high confidence
- le reste principalement medium confidence

Aucune des 13 n'a un `property_listing` correspondant au fingerprint attendu `sha256(openserp:<canonical_url>)`.

Elles proviennent de plusieurs runs historiques. La DB seule ne permet pas de prouver la cause exacte : write error historique, interruption/budget ou logique ancienne doivent être distingués si ce petit gap devient prioritaire.

Elles constituent un **petit audit de write-gap**, pas un gisement de centaines de listings.

---

## 3. Seed confirmation réelle

229 seeds possèdent des métadonnées de tentative de confirmation.

Total cumulé : **320 tentatives**.

Dernier outcome par seed :

- `no_exact_match` : 205 seeds / 291 tentatives cumulées
- `exact_high_confidence` : 17 seeds / 17 tentatives
- `insufficient_explicit_signals` : 7 seeds / 12 tentatives

Yields :

- exact high-confidence / attempted unique seeds : **17 / 229 = 7.4 %**
- exact high-confidence / total attempts : **17 / 320 = 5.3 %**

### Les 17 succès sont de vraies conversions

Vérification temporelle :

- successful seed confirmations : 17
- ont aujourd'hui un `listing_sources` : 17
- `listing_sources.first_seen_at` antérieur à la tentative seed : **0**
- `first_seen_at` au moment ou après la tentative : **17**

Conclusion : le moteur Seed Listing Mass Conversion crée réellement des structured listings ; les succès ne sont pas de simples refreshs d'annonces déjà persistées.

Le problème principal reste donc le **yield**, pas la réalité de la conversion.

---

## 4. Masaken — analyse du 11/16

### Résultat observé

- total seeds Masaken : **294**
- seeds tentés : **16**
- exact high-confidence : **11**
- no exact match : **5**
- yield sur le petit batch tenté : **68.8 %**

### Structure URL

Les 16 seeds tentés ont tous :

- provider `commoncrawl_cdx` ;
- une URL individuelle à 4 segments environ ;
- un identifiant numérique stable final ;
- le pattern registry strict : `/(fr|en)/immobilier-maroc/<slug>/<id>`.

Le registre est volontairement restrictif pour exclure des URLs numériques qui ne sont pas des fiches individuelles.

### Différence succès / échec

Les **11 succès** :

- ont tous un exact overlap `discovery_candidates` créé par la confirmation ;
- cet overlap est `accepted` ;
- ont tous été `fresh_confirmed` ;
- portent typiquement `strong_individual_path + explicit_city + surface_signal`, souvent enrichi de prix/district/chambres ;
- ont produit des listings structurés réels.

Les **5 échecs** :

- ont le même bon format URL ;
- ont eux aussi un ID numérique stable ;
- mais la recherche de confirmation n'a retourné aucun exact canonical match.

Sur l'ensemble des 294 seeds Masaken :

- exact discovery overlap : **11**
- accepted overlap : **11**
- fresh_confirmed : **11**

### Conclusion Masaken

Le rendement n'est pas dû à un assouplissement.

Le modèle favorable combine :

1. pattern individuel très discriminant ;
2. ID stable ;
3. indexabilité moteur réelle ;
4. exact canonical match ;
5. signaux métier explicites ;
6. admission existante inchangée.

Le 68.8 % ne doit pas être extrapolé aux 278 seeds non testés : le sample est petit et sélectionné.

Masaken est cependant le meilleur laboratoire pour définir une lane `yield-aware` sûre.

---

## 5. Vue multi-source du yield seed

| Source | Seeds | Tentés | Confirmés | Yield tentés | Exact overlap accepted / seeds |
|---|---:|---:|---:|---:|---:|
| Masaken | 294 | 16 | 11 | 68.8 % | 3.74 % |
| Aykana | 625 | 15 | 2 | 13.3 % | 0.96 % |
| Souk Immobilier | 637 | 12 | 1 | 8.3 % | 0.47 % |
| L'Immobilier Sans Frontières | 1,373 | 40 | 2 | 5.0 % | 1.02 % |
| Promo Immo Marrakech | 3,003 | 36 | 1 | 2.8 % | 0.03 % |
| DarAgadir | 6,378 | 10 | 0 | 0 % | 0.31 % |
| Agenz | 1,221 | 16 | 0 | 0 % | 0.16 % |
| Avito | 4,363 | 12 | 0 | 0 % | 0 % |
| Mubawab | 2,922 | 16 | 0 | 0 % | 0 % |
| Atlas Immobilier | 771 | 8 | 0 | 0 % | 0 % |
| Barnes Marrakech | 282 | 36 | 0 | 0 % | 0 % |
| Kawtar Immobilier | 77 | 12 | 0 | 0 % | 0 % |

Lecture : un identifiant stable ne suffit pas. Barnes possède également des IDs stables mais son canal de confirmation actuel n'obtient aucun exact match dans le batch testé.

Le facteur différenciant est donc aussi la **discoverability/indexability par le moteur de confirmation**.

---

## 6. `fresh_confirmed` ≠ structured listing

Réconciliation :

- fresh_confirmed total : 57
- fresh_confirmed issus d'un `exact_high_confidence` seed confirmation : 17
- fresh_confirmed sans métadonnée de tentative seed : 40

Freshness, confirmation et structured conversion sont trois notions différentes.

---

## 7. Structured listings / Property Graph

- `property_listings` : 869
- `listing_sources` : 874
- listings sans source : 0
- listings multi-source : 4
- `persisted_openserp` source rows : 730
- legacy / origin NULL source rows : 144

Property Graph :

- clusters : 730
- memberships : 730
- clusters multi-member : **0**

Le graphe reste essentiellement 1 SourceOffer → 1 cluster.

---

## 8. Observation Ledger — finding critique

`source_offer_observations` : **0 ligne**.

La structure existe mais n'est pas alimentée.

Les seeds et listing sources conservent certains timestamps, mais il n'existe pas encore d'historique événementiel complet pour reconstruire proprement :

- fresh ;
- stale ;
- gone ;
- reappeared.

Le design d'alimentation idempotente doit être préparé avant tout code.

---

## 9. Taxonomie réelle des 6,013 `unclassified`

Tous les `unclassified` ont actuellement `admission_confidence = low`.

Répartition opérationnelle :

| Bucket | Volume | Lecture |
|---|---:|---|
| discovery/category pages | **2,225** | pas des fiches individuelles structurées |
| domain unclassified | **1,837** | source non qualifiée au moment de l'observation |
| quarantine | **1,252** | résultats ayant type+transaction mais bloqués par la classification |
| blocked domains | **569** | ne pas promouvoir |
| other low confidence | **116** | audit secondaire |
| insufficient detail other | **14** | faible volume |

### Domain-status historique devenu stale

Parmi les 1,837 `domain_unclassified`, seulement **52** correspondent à des domaines aujourd'hui explicitement approuvés dans le registry analysé :

- Masaken : 51
- DarAgadir : 1

Il s'agit d'un petit stock historique à reclassifier/auditer, pas de milliers de candidats prêts à publier.

---

## 10. Quarantine — finding structurel : cross-city mismatch

Sur les 1,252 quarantined :

- strong individual path : 144
- explicit city : 1,169
- strong path + explicit city : 139
- strong path + city + au moins un signal prix/surface/chambres : **99**

Répartition des 99 high-signal :

- Mubawab : 40
- Barnes Marrakech : 29
- Agenz : 12
- Mouldar : 8
- Avito : 3
- 1immo : 2
- Promo Immo Marrakech : 2
- Souk Immobilier : 1
- DarAgadir : 1
- L'Immobilier Sans Frontières : 1

### Pourquoi ces strong paths restent en quarantine

La logique `classify.ts` montre qu'un résultat en quarantine possède déjà type + transaction.

Si `strong_individual_path` est vrai et que la localisation explicite est cohérente avec la requête, le résultat passe `individual_listing`.

Donc un strong-path qui arrive malgré tout en `quarantine` est bloqué par :

**`explicitLocationMatchesQuery = false`**.

Le problème n'est donc pas simplement "insufficient detail" malgré le libellé générique ajouté au reason array.

Il s'agit principalement de résultats immobiliers forts retournés par un moteur sur une requête d'une autre ville/quartier.

### Piste future — sans code maintenant

Au lieu d'abaisser les seuils, étudier un mécanisme conservateur de :

**cross-city salvage / re-bucketing**

Principe possible : une fiche avec strong individual URL + type + transaction + ville explicite fiable pourrait être réaffectée à sa ville observée plutôt que perdue parce que le moteur l'a renvoyée sur une requête différente.

Cela nécessite avant toute implémentation :

- audit d'échantillon ;
- preuve de fiabilité de l'extracteur ville ;
- hard blocks district/ville ;
- dédup ;
- aucune utilisation du query context pour inventer une localisation.

---

## 11. Priorités read-only après ce pré-audit

### P0-A — 13 accepted/write-gap

Auditer les 13 vraies accepted non persistées.

### P0-B — 99 high-signal cross-city quarantine

Échantillon prioritaire pour mesurer si un re-bucketing conservateur est justifié.

### P0-C — Masaken-like pattern study

Comparer Masaken aux autres domaines selon deux axes distincts :

- qualité du pattern individuel / identifiant stable ;
- capacité du moteur de confirmation à retrouver l'exact canonical URL.

### P0-D — source/domain qualification

Traiter les 1,837 domain-unclassified source par source, sans gonfler artificiellement le stock avec réseaux sociaux, moteurs, sites étrangers ou agrégateurs parasites.

### P0-E — Observation Ledger design

Préparer la stratégie d'observation idempotente avant Freshness Machine.

---

# Verdict

Les trois pistes ont réduit fortement l'incertitude :

1. **Accepted non persistées : 13 réelles, pas 307.**
2. **Unclassified : la majorité est correctement écartée ; 99 cas high-signal révèlent surtout un problème potentiel de cross-city re-bucketing, pas un besoin d'abaisser les seuils.**
3. **Masaken : 11/16 de vraies conversions, grâce au combo pattern stable + exact search-engine visibility ; sample trop petit pour extrapoler.**

Le prochain levier DATA n'est pas un nouveau moteur.

Séquence recommandée :

`13 write-gap audit → 99 cross-city audit → Masaken-like lane analysis → Bulk Confirmation V2 yield-aware → Observation Ledger foundation`

Toujours sans code avant GO.
