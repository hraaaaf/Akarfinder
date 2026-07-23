# AkarFinder — DATA Funnel Spec

**Version : 2026-07-23**
**Statut : préparation documentaire — aucun changement runtime**

## Objectif

Définir un vocabulaire unique et mesurable pour le funnel DATA afin d'éviter de comparer des compteurs appartenant à des populations différentes.

Le Funnel Truth Audit ne doit surtout pas modéliser le système comme un tunnel purement linéaire : le repo possède déjà **deux voies publiques distinctes**.

### Lane A — thin external index

`DISCOVERED → NORMALIZED → UNIQUE_SEED → THIN_INDEX_ELIGIBLE → SEARCHABLE_THIN`

Cette lane peut exposer un lien externe registry-approved sans créer de `property_listing`, sans prix/photo/contact inventé et sans fiche interne.

### Lane B — structured listing

`DISCOVERED → NORMALIZED → UNIQUE_SEED → CONFIRMABLE → ATTEMPTED → CONFIRMED → ADMISSIBLE → STRUCTURED → DISPLAY_ELIGIBLE → SEARCHABLE_STRUCTURED → CANONICAL_PROPERTY`

Cette distinction réconcilie deux invariants qui semblent contradictoires si on les lit sans contexte :

- le lifecycle historique affirme qu'un raw seed ne doit jamais devenir un **listing structuré publié** par simple découverte ;
- `THIN-INDEX-SEED-SEARCH-V1` autorise certains seeds publics registry-approved à apparaître comme **liens externes thin**, sans promotion vers `property_listings`.

Le Funnel Truth Audit devra mesurer ces deux lanes séparément.

---

## États canoniques

### 1. DISCOVERED

Une URL ou représentation a été découverte par une voie autorisée : OpenSERP, sitemap public, Common Crawl, flux partenaire/autorisé ou autre source enregistrée.

Ce compteur n'implique ni fraîcheur, ni validité métier, ni droit de création d'un listing structuré.

### 2. NORMALIZED

L'URL a été canonicalisée : domaine, protocole, slash, paramètres non pertinents et variantes techniques traités selon les règles de normalisation.

### 3. UNIQUE_SEED

Une représentation logique unique après seed-level dedup.

Important : ce n'est pas encore un bien immobilier unique.

### 4A. THIN_INDEX_ELIGIBLE

Le seed satisfait les règles strictes de la lane thin externe :

- provider autorisé (`public_sitemap` / `commoncrawl_cdx` selon politique active) ;
- domaine registry-approved ;
- URL conforme aux `listing_url_patterns` validés ;
- aucun doublon avec une représentation persistée déjà servie ;
- aucun enrichissement inventé ;
- redirection vers la source originale uniquement.

### 5A. SEARCHABLE_THIN

Le seed peut apparaître dans la recherche comme résultat externe thin.

Cela ne signifie PAS :

- qu'il est devenu `property_listing` ;
- qu'il est actuellement disponible ;
- qu'il possède un prix vérifié ;
- qu'il appartient à une canonical property validée.

### 4B. CONFIRMABLE

Le seed possède suffisamment de structure / signaux pour entrer dans une stratégie de confirmation sans violer les politiques source.

### 5B. CONFIRMATION_ATTEMPTED

Au moins une tentative de confirmation autorisée a été exécutée.

Chaque tentative doit conserver :

- timestamp ;
- run ;
- méthode ;
- source ;
- outcome normalisé.

### 6B. CONFIRMED

Une preuve indépendante suffisante confirme l'existence / identité de la représentation selon la politique de la lane utilisée.

`fresh_confirmed` est un état de fraîcheur / recroisement exact et ne doit pas être utilisé comme synonyme de `structured listing`.

### 7B. ADMISSIBLE

Le candidat satisfait les règles d'admission métier et de sécurité requises pour devenir une représentation structurée.

### 8B. STRUCTURED_LISTING

Une représentation structurée existe dans le modèle AkarFinder avec les attributs réellement observés / autorisés.

Aucune donnée manquante ne doit être inventée pour franchir ce gate.

### 9B. DISPLAY_ELIGIBLE

Le résultat satisfait la politique d'affichage applicable à sa source et à son niveau de preuve.

### 10B. SEARCHABLE_STRUCTURED

Le résultat structuré est réellement récupérable par `/search` selon les règles produit actuelles.

### 11. CANONICAL_PROPERTY

Une entité canonique Property Graph représente un bien/offre unique potentiel, éventuellement relié à plusieurs SourceOffers.

Ce niveau appartient à Property Graph V3 et ne doit jamais être confondu avec seed-level dedup.

---

## États / modèles déjà présents dans le repo à réconcilier

Le pré-audit a identifié plusieurs vocabulaires coexistants :

### `source_offer_seeds.freshness_status`

Historique connu :

- `seed_only` ;
- `fresh_confirmed` ;
- `aging` ;
- `stale`.

Le matcher historique repose sur un exact `canonical_url` contre des observations `discovery_candidates` issues de canaux frais autorisés.

### Index lifecycle conceptuel

Un autre modèle pur introduit :

- `DISCOVERED_SEED` ;
- `FRESH_CONFIRMED` ;
- `INDEXED` ;
- `AGING` ;
- `STALE` ;
- `REMOVED`.

Le Funnel Truth Audit doit déterminer exactement :

- lequel de ces états est réellement persisté aujourd'hui ;
- lequel est seulement un modèle logique / test ;
- comment il se raccorde à `source_offer_seeds`, `discovery_candidates`, `property_listings`, `listing_sources` et au thin index ;
- quelles définitions sont canoniques et lesquelles doivent rester legacy.

Aucune migration ou refonte ne doit être décidée avant ce mapping.

---

## Outcomes de perte obligatoires

Chaque perte du funnel structured doit être classée dans un motif explicite, par exemple :

- duplicate_seed ;
- invalid_url ;
- out_of_scope ;
- source_policy_block ;
- no_confirmation_evidence ;
- no_exact_match ;
- insufficient_explicit_signals ;
- low_confidence ;
- contradictory_signals ;
- stale_or_gone ;
- incomplete_for_structure ;
- display_ineligible ;
- suppressed_by_policy ;
- unknown_error.

Pour la lane thin, suivre séparément :

- invalid_listing_pattern ;
- unsupported_seed_provider ;
- duplicate_with_persisted ;
- query_mismatch ;
- policy_suppressed.

`unknown_error` doit rester un bucket temporaire à réduire, jamais un résultat acceptable durable.

---

## Dimensions minimales de mesure

Chaque étape doit pouvoir être ventilée par :

- source_domain ;
- acquisition_channel ;
- city ;
- district si connu ;
- transaction_type ;
- property_type ;
- language / query family si pertinent ;
- evidence_type ;
- age bucket ;
- outcome ;
- public lane (`thin` vs `structured`).

---

## Snapshot à expliquer lors du Funnel Truth Audit

Repères actuels communiqués au 2026-07-23 :

- 21 946 URLs candidates ;
- 11 420 Sitemap ;
- 10 526 Common Crawl ;
- 44 `fresh_confirmed` ;
- 840 `property_listings` ;
- 701 clusters.

Le premier audit doit répondre clairement :

1. Les 44 `fresh_confirmed` sont-ils un sous-ensemble des 840 listings ou une population différente ?
2. Combien de seeds sont réellement uniques après normalisation ?
3. Combien sont `SEARCHABLE_THIN` aujourd'hui, séparément des listings structurés ?
4. Combien ont déjà été tentés en confirmation structurée ?
5. Quelle est la distribution exacte des outcomes de confirmation ?
6. Quel est le yield par source / ville / type / transaction ?
7. Quelle part des 840 listings provient d'anciens pipelines hors seed reservoir ?
8. Combien des 840 sont display eligible et effectivement searchable ?
9. Quels états lifecycle sont réellement persistés vs seulement calculés ?
10. Où se situe exactement la frontière entre `fresh_confirmed`, `INDEXED`, `property_listing` et thin external result ?

---

## Gate de sortie `DATA-FUNNEL-TRUTH-AUDIT-1`

Le gate est PASS seulement si :

- les lanes thin et structured sont mesurées séparément ;
- tous les compteurs majeurs ont une définition unique ;
- les populations sont réconciliées sans double comptage ;
- les états persistés vs conceptuels sont identifiés ;
- les pertes principales sont quantifiées ;
- le yield est connu par source et segment ;
- les 3 plus gros goulots d'étranglement sont prouvés ;
- aucune architecture de scaling n'est décidée sur une métrique ambiguë.

## Hors scope

- aucun changement DB ;
- aucune migration ;
- aucun changement runtime ;
- aucun assouplissement d'admission ;
- aucun déploiement Vercel.
