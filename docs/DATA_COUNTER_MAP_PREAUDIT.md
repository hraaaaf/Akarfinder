# AkarFinder — DATA Counter Map (pré-audit)

**Date : 2026-07-23**
**Nature : lecture seule / préparation de `DATA-FUNNEL-TRUTH-AUDIT-1`**

## Objet

Documenter les compteurs, tables et états déjà repérés dans le repo avant toute mission de code.

Ce document n'affirme pas encore que tous ces modèles sont câblés de bout en bout en Production. Son but est précisément de préparer la réconciliation.

---

## 1. `source_offer_seeds`

Table dédiée aux seeds de masse issue de sources publiques autorisées.

Historique repo : migration appliquée en Production le 2026-07-21 avec RLS activée.

Rôles identifiés :

- stocker les URLs candidates canonicalisées ;
- distinguer provider / provenance ;
- porter un `freshness_status` ;
- servir de réservoir à la confirmation ;
- servir de réservoir au thin external index sous règles strictes.

États repérés :

- `seed_only` ;
- `fresh_confirmed` ;
- `aging` ;
- `stale`.

Point à auditer : définir si `aging/stale` sont actuellement utilisés par la lane thin, la lane conversion, les deux, ou seulement certains jobs.

---

## 2. `discovery_candidates`

Utilisé comme population d'observations / découvertes issues de canaux de recherche frais.

Le matcher historique de freshness fait un exact `canonical_url` entre :

`source_offer_seeds ↔ discovery_candidates`

Aucun fuzzy match ne doit promouvoir un seed.

Point à auditer :

- nombre exact de lignes ;
- distribution par `discovery_status` ;
- chevauchement exact avec `source_offer_seeds` ;
- distinction entre observation et candidat de publication.

---

## 3. Seed freshness model

Modèle historique repéré :

`seed_only → fresh_confirmed → aging → stale`

Définition historique :

- fresh_confirmed : exact fresh observation ≤30 jours ;
- aging : 31–90 jours ;
- stale : >90 jours.

Ce modèle ne signifie pas automatiquement qu'un résultat a été admis comme listing structuré.

---

## 4. Index lifecycle model

Un autre modèle conceptuel / testé existe :

`DISCOVERED_SEED → FRESH_CONFIRMED → INDEXED → AGING → STALE`

plus :

`REMOVED`

Invariants historiques :

- seed discovery seule ne crée jamais un structured listing ;
- admission distincte nécessaire avant `INDEXED` ;
- re-observation fraîche peut réactiver un record admis ;
- `REMOVED` exige une vraie re-observation fraîche pour revenir.

Point critique : déterminer si ce lifecycle est réellement persisté / utilisé par le runtime actuel ou s'il reste une abstraction de test / scale gate.

---

## 5. Thin Index Seed Search V1

Lane publique distincte introduite après le lifecycle ci-dessus.

Elle autorise certains seeds à apparaître comme **résultats externes thin** sans création de `property_listing`.

Conditions repérées :

- `public_sitemap` ou `commoncrawl_cdx` ;
- domaine registry-approved ;
- URL conforme aux patterns listing validés ;
- matching query/city/type/intent via l'URL ;
- exclusion des URLs déjà représentées dans `listing_sources` ;
- aucun prix/photo/contact/disponibilité inventé ;
- CTA source originale ;
- aucun internal detail page.

Conséquence :

**`searchable` doit être séparé en `SEARCHABLE_THIN` et `SEARCHABLE_STRUCTURED`.**

Sinon les chiffres de profondeur deviennent trompeurs.

---

## 6. Seed Listing Mass Conversion V1

Lane de conversion structurée déjà présente.

Comportement repéré :

- lit un batch de seeds `seed_only` ;
- confirmation via moteur de recherche autorisé ;
- exact canonical URL obligatoire ;
- ville + transaction + type explicites obligatoires ;
- admission HIGH confidence ;
- réutilise le writer national existant ;
- aucun custom bypass vers `property_listings` ;
- échecs restent seeds, avec rotation.

Baseline documentée avant Query V2 :

- 88 tentatives ;
- 4 exact high-confidence confirmations ;
- yield 4,5 % ;
- 82 `no_exact_match` ;
- 2 `insufficient_explicit_signals`.

Cette baseline explique pourquoi le chantier actuel doit être **yield / batching / funnel truth**, pas reconstruction du moteur.

---

## 7. Seed Confirmation Query V2

Optimisation déjà fusionnée :

- requêtes identifier-first ;
- références stables / IDs ;
- moins de dilution de slug ;
- exclusion holiday/vacation out-of-scope ;
- préférence aux URLs avec identifiant stable ;
- garde-fous inchangés.

Point à mesurer : yield réel post-V2 par source et segment.

---

## 8. `property_listings`

Compteur actuel communiqué : **840**.

Ce compteur mélange potentiellement plusieurs lignées historiques :

- anciens imports / pipelines ;
- OpenSERP persisted listings ;
- seed mass conversion ;
- partenaires / first-party selon les données présentes.

Le Funnel Truth Audit doit ventiler les 840 par origine réelle.

---

## 9. `listing_sources`

Relie les représentations structurées à leurs sources.

Utilisé notamment pour éviter qu'un seed thin déjà représenté par une source persistée apparaisse comme doublon externe.

Point à auditer :

- ratio `property_listings ↔ listing_sources` ;
- multi-source attachments ;
- provenance manquante ;
- lignes legacy ambiguës.

---

## 10. Property Graph / clusters

Compteur actuel communiqué : **701 clusters**.

État fonctionnel actuel : encore principalement `1 SourceOffer = 1 cluster`.

Le repo contient déjà une fondation Market Index et des garde-fous issus d'anciens audits montrant que le legacy `duplicate_group_id` pouvait fusionner à tort des biens distincts.

Conséquence : Property Graph V3 doit rester conservateur et ne jamais réutiliser aveuglément le legacy duplicate grouping.

---

# Questions exactes du prochain audit

1. Quels compteurs sont physiques en DB et lesquels sont calculés ?
2. Quelle table est la source de vérité de chaque compteur ?
3. Quelle est la cardinalité exacte entre seed, discovery candidate, listing source, property listing et cluster ?
4. Quels états freshness/lifecycle sont réellement persistés aujourd'hui ?
5. Combien de seeds sont exposables thin ?
6. Combien sont tentés pour structured conversion ?
7. Quel est le yield post Query V2 ?
8. Combien de `property_listings` proviennent réellement de la conversion seed ?
9. Combien de structured listings sont effectivement searchable ?
10. Où existent les doubles comptes entre thin index, gateway et structured results ?

---

## Verdict pré-audit

Le problème principal n'est pas l'absence de briques : **beaucoup de briques existent déjà**.

Le risque principal est désormais la coexistence de plusieurs vocabulaires / états / lanes historiques qui peuvent produire des KPI trompeurs si on les additionne sans réconciliation.

La meilleure prochaine mission reste donc :

**`DATA-FUNNEL-TRUTH-AUDIT-1` — lecture seule d'abord, aucun redesign ni migration tant que les compteurs ne sont pas réconciliés.**
