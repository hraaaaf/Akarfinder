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

Elles proviennent de plusieurs runs historiques. Elles constituent un **petit audit de write-gap**, pas un gisement de centaines de listings.

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

Le problème principal reste donc le yield de confirmation, mais il est extrêmement hétérogène selon la source.

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

- ont tous un exact overlap `discovery_candidates` ;
- cet overlap est `accepted` ;
- ont tous été `fresh_confirmed` ;
- portent typiquement `strong_individual_path + explicit_city + surface_signal`, souvent enrichi de prix/district/chambres.

Les **5 échecs** :

- ont le même bon format URL ;
- ont eux aussi un ID numérique stable ;
- mais n'ont **aucun exact overlap** dans `discovery_candidates`.

Sur l'ensemble des 294 seeds Masaken :

- exact discovery overlap : **11**
- accepted overlap : **11**
- unclassified overlap : 0
- rejected overlap : 0
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

## 5. `fresh_confirmed` ≠ structured listing

Réconciliation :

- fresh_confirmed total : 57
- fresh_confirmed issus d'un `exact_high_confidence` seed confirmation : 17
- fresh_confirmed sans métadonnée de tentative seed : 40

Donc freshness, confirmation et structured conversion sont trois notions différentes.

---

## 6. Structured listings / Property Graph

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

## 7. Observation Ledger — finding critique

`source_offer_observations` : **0 ligne**.

La structure existe mais n'est pas alimentée.

Les seeds et listing sources conservent certains timestamps, mais il n'existe pas encore d'historique événementiel complet pour reconstruire proprement :

- fresh ;
- stale ;
- gone ;
- reappeared.

Le design d'alimentation idempotente doit être préparé avant tout code.

---

## 8. Taxonomie réelle des 6,013 `unclassified`

Tous les `unclassified` ont actuellement `admission_confidence = low`.

Répartition opérationnelle :

| Bucket | Volume | Lecture |
|---|---:|---|
| discovery/category pages | **2,225** | pas des fiches individuelles structurées |
| domain unclassified | **1,837** | source non qualifiée au moment de l'observation |
| quarantine / insufficient detail | **1,252** | principal pool à auditer pour recovery |
| blocked domains | **569** | ne pas promouvoir |
| other low confidence | **116** | audit secondaire |
| insufficient detail other | **14** | faible volume |

### Domain-status historique devenu stale

Parmi les 1,837 `domain_unclassified`, seulement **52** correspondent à des domaines aujourd'hui explicitement approuvés dans le registry analysé :

- Masaken : 51
- DarAgadir : 1

Cela montre qu'une petite partie du stock porte un statut historique devenu obsolète, mais pas des milliers de candidats immédiatement récupérables.

---

## 9. Quarantine recovery — cible réelle

Sur 1,252 quarantined :

- `strong_individual_path` : 144
- `explicit_city` : 1,169
- `surface_signal` : 260
- `price_signal` : 42
- `bedroom_signal` : 175
- `strong_individual_path + explicit_city` : 139
- **near-miss structurés** avec strong path + city + au moins un détail : **99**

Répartition des 99 near-miss :

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

### Conclusion recovery

Le bon premier échantillon n'est pas 6,013 ni 1,252.

C'est **99 near-miss fortement structurés**, à auditer sans changer les seuils.

Le but est de découvrir :

- faux négatifs du classifier ;
- patterns source incomplets ;
- données réellement insuffisantes ;
- cas qu'il faut continuer à laisser en quarantaine.

---

## 10. Priorités read-only après ce pré-audit

### P0-A — 13 accepted/write-gap

Auditer les 13 vraies accepted non persistées.

Objectif : déterminer si elles proviennent de write errors historiques, logique ancienne, ou cas intentionnels.

### P0-B — 99 quarantine near-miss

Échantillon prioritaire pour mesurer un `recoverable rate` réel sans assouplir les règles.

### P0-C — Masaken pattern study

Comparer la mécanique Masaken à d'autres domaines possédant :

- ID stable ;
- strong individual URL pattern ;
- forte indexabilité.

Chercher les propriétés réplicables de la lane, pas copier un seuil spécifique à Masaken.

### P0-D — domain qualification

Les 1,837 domain-unclassified doivent être traités source par source ; réseaux sociaux, moteurs, sites étrangers et agrégateurs parasites ne doivent pas gonfler artificiellement la roadmap DATA.

### P0-E — Observation Ledger design

Préparer la stratégie d'observation idempotente avant Freshness Machine.

---

# Verdict

Les trois pistes ont réduit considérablement l'incertitude :

1. **Accepted non persistées : 13 réelles, pas 307.**
2. **Unclassified : seulement 99 near-miss structurés prioritaires sur 6,013.**
3. **Masaken : modèle prometteur fondé sur URL stable + exact re-observation, mais sample trop petit pour extrapoler 68.8 %.**

Le prochain levier DATA n'est donc pas un nouveau moteur ni une baisse des seuils.

Il faut d'abord :

`13 write-gap audit → 99 near-miss audit → Masaken-like lane analysis → Bulk Confirmation V2 yield-aware`

Toujours sans code avant GO.
