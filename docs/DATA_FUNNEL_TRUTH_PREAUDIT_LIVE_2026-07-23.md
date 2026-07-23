# AkarFinder — DATA Funnel Truth Pre-Audit Live

**Date : 2026-07-23**
**Mode : Supabase Production READ-ONLY**
**Aucun write, aucune migration, aucun changement runtime, aucun Vercel.**

## 1. Snapshot DB réel observé

| Population | Count |
|---|---:|
| `source_offer_seeds` | 21,946 |
| `discovery_candidates` | 14,720 |
| `property_listings` | 869 |
| `listing_sources` | 874 |
| `property_clusters` | 730 |
| `property_cluster_members` | 730 |
| `source_offer_observations` | 0 |

### Seeds par provider

- `public_sitemap` : 11,420
- `commoncrawl_cdx` : 10,526

### Freshness seeds

- `seed_only` : 21,889
- `fresh_confirmed` : 57
- `aging` : 0 observé
- `stale` : 0 observé

Le chiffre `fresh_confirmed` est donc déjà passé de la baseline communiquée de 44 à **57** pendant la phase DATA.

---

## 2. Découverte OpenSERP

`discovery_candidates` : 14,720 lignes, toutes avec provider `openserp` dans le snapshot observé.

Statuts :

- rejected : 8,122
- unclassified : 6,013
- accepted : 585

Cela montre un réservoir important encore non classifié.

Important : `unclassified` n'est pas automatiquement une opportunité publiable. Il s'agit d'un réservoir à expliquer / classifier, pas à promouvoir en masse.

---

## 3. Relation accepted discoveries ↔ persisted sources

Après déduplication exacte des URLs :

- accepted discovery URLs uniques : 559
- listing source URLs uniques : 792
- exact overlap : 252

Donc **307 accepted discovery URLs uniques n'ont pas d'overlap URL exact avec `listing_sources`** dans cette comparaison.

Ce chiffre est un **pool d'audit**, pas un pool à promouvoir automatiquement.

Questions à résoudre :

- sont-elles encore fraîches ?
- sont-elles admissibles structurées ?
- sont-elles déjà représentées sous une URL différente ?
- sont-elles seulement adaptées à la lane thin ?
- contiennent-elles les champs explicites nécessaires ?

---

## 4. Seed confirmation réelle

229 seeds possèdent des métadonnées de tentative de confirmation.

Total cumulé de tentatives : **320**.

Dernier outcome par seed :

- `no_exact_match` : 205 seeds / 291 tentatives cumulées
- `exact_high_confidence` : 17 seeds / 17 tentatives
- `insufficient_explicit_signals` : 7 seeds / 12 tentatives

### Yields actuels

- exact high-confidence / attempted unique seeds : **17 / 229 = 7.4 %**
- exact high-confidence / total attempts : **17 / 320 = 5.3 %**

La conversion est donc encore faible globalement, mais très hétérogène par source.

---

## 5. Yield par source — signal stratégique

### Très fort signal

**masaken.ma**

- 16 seeds tentés
- 11 exact high-confidence
- yield unique ≈ **68.8 %**

C'est de très loin le meilleur signal observé.

### Signal positif mais faible volume / yield

**aykana.ma**

- 15 seeds tentés
- 2 exact high-confidence

**limmobiliersansfrontieres.com**

- 40 seeds tentés
- 2 exact high-confidence

**promoimmomarrakech.com**

- 36 tentés
- 1 exact high-confidence

**soukimmobilier.com**

- 12 tentés
- 1 exact high-confidence

### Zéro exact high-confidence dans le snapshot tenté

- barnes-marrakech.com
- mubawab.ma
- agenz.ma
- kawtarimmobilier.com
- avito.ma
- daragadir.com
- atlasimmobilier.com

**Conclusion : le prochain Bulk Confirmation V2 ne doit pas répartir naïvement la capacité de façon uniforme.**

Il faut une stratégie `yield-aware`, tout en gardant une part d'exploration contrôlée pour ne pas sur-optimiser sur un seul domaine.

---

## 6. Pourquoi `57 fresh_confirmed` ≠ `57 structured listings`

Réconciliation observée :

- fresh_confirmed total : 57
- fresh_confirmed avec `exact_high_confidence` via seed confirmation : 17
- fresh_confirmed sans métadonnée de tentative seed : 40

Donc les **40 autres fresh_confirmed proviennent d'un autre recroisement exact / lane freshness**, et ne doivent pas être comptés comme conversions structurées.

Cette distinction explique une partie de l'anomalie apparente initiale entre `fresh_confirmed` et `property_listings`.

---

## 7. Structured listings réels

Snapshot :

- `property_listings` : 869
- `listing_sources` : 874
- listings avec au moins une source : 869
- listings sans source : 0
- listings multi-source : 4
- max sources sur un listing : 3

Origines `listing_sources` :

- `persisted_openserp` : 730
- `origin_type = NULL` legacy/autres : 144

Le nombre de runs dont `ingestion_run_id` contient `seed` est **17**, cohérent avec les 17 confirmations exact high-confidence observées.

Lecture la plus probable à valider formellement :

- environ 730 structured listings issus de la lignée persisted OpenSERP ;
- environ 139 listings issus de la lignée legacy/autres, représentés par 144 source rows à cause de quelques multi-sources ;
- 17 conversions seed structurées sont incluses dans la lignée persistée / ingestion actuelle.

---

## 8. Property Graph réel

- clusters : 730
- members : 730
- clusters multi-member : **0**
- max member count : 1
- clusters avec `legacy_property_listing_id` : 730

Conclusion : le Property Graph actuel est encore effectivement **1 member = 1 cluster** sur les clusters matérialisés.

Le vrai dédoublonnage multi-source V3 n'est donc pas encore réalisé.

---

## 9. Freshness / Observation Ledger — finding critique

La table `source_offer_observations` existe mais contient :

**0 observation**.

C'est un finding important.

La structure nécessaire à l'historique temporel existe, mais l'Observation Ledger n'est pas encore alimenté dans le snapshot live.

Conséquence :

- les seeds possèdent des timestamps / freshness metadata ;
- les listing sources possèdent `first_seen_at` / `last_seen_at` ;
- mais l'historique événementiel `source_offer_observations` n'est pas encore constitué.

La future Freshness Machine gagnera beaucoup à commencer à préserver ces observations dès la phase de confirmation / ingestion, sans attendre #24.

Aucun changement ne doit être codé avant le GO et avant définition exacte du writer / idempotence / volume.

---

## 10. Gros réservoir `unclassified`

Top domaines par volume `unclassified` observé :

- sarouty.ma : 602
- mubawab.ma : 559
- avito.ma : 437
- agenz.ma : 422
- mouldar.com : 291
- barnes-marrakech.com : 257
- marrakechrealty.com : 249
- 1immo.ma : 240
- immobilier.trovit.ma : 231
- immo.mitula.ma : 207

Ce réservoir peut contenir du bruit, des pages non-listing ou des opportunités perdues.

La bonne approche n'est pas `promote all`, mais :

1. échantillonnage ;
2. taxonomy des causes `unclassified` ;
3. mesure du recoverable rate ;
4. correction ciblée uniquement si le gain justifie le risque.

---

# 11. Priorités recommandées après ce pré-audit

## P0-A — finir Funnel Truth Audit

Réconcilier exactement :

- seeds ;
- discovery candidates ;
- thin searchable ;
- confirmation attempts ;
- fresh_confirmed ;
- structured listings ;
- listing sources ;
- clusters.

## P0-B — Bulk Confirmation V2 yield-aware

Ne pas reconstruire le moteur.

Optimiser l'existant autour de :

- source yield ;
- stable identifiers ;
- batch evidence ;
- buckets ville/type/transaction ;
- exploitation prioritaire des sources à fort yield ;
- exploration contrôlée des sources encore incertaines.

`masaken.ma` est le premier candidat évident à analyser pour comprendre **pourquoi** son yield est ~68.8 % et répliquer le mécanisme quand c'est légitime.

## P0-C — accepted-but-unpersisted audit

Auditer les ~307 accepted unique URLs sans overlap exact `listing_sources`.

Objectif : comprendre si une partie peut alimenter le structured funnel sans nouvelles acquisitions.

## P0-D — unclassified recovery audit

Échantillonner les 6,013 `unclassified` avant de dépenser davantage en découverte brute.

## P0-E — observation design

Préparer, sans code avant GO, la stratégie d'alimentation idempotente de `source_offer_observations`.

---

# Verdict

Le système possède déjà beaucoup plus de matière exploitable que ne le suggère le simple ratio `21,946 → 57`.

Le vrai levier immédiat semble être :

**mieux convertir et mieux réconcilier le stock existant avant de courir uniquement après davantage d'URLs.**

Le prochain code ne doit toujours pas partir sans GO.

Mission recommandée après validation :

**`DATA-FUNNEL-TRUTH-AUDIT-1`**, d'abord read-only, suivie seulement ensuite de **`BULK-SEED-CONFIRMATION-V2`** ciblée sur les bottlenecks prouvés.
