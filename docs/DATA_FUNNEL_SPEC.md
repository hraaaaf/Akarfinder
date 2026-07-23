# AkarFinder — DATA Funnel Spec

**Version : 2026-07-23**
**Statut : préparation documentaire — aucun changement runtime**

## Objectif

Définir un vocabulaire unique et mesurable pour le funnel DATA afin d'éviter de comparer des compteurs appartenant à des populations différentes.

Le Funnel Truth Audit devra produire une vue exacte :

`DISCOVERED → NORMALIZED → UNIQUE_SEED → CONFIRMABLE → ATTEMPTED → CONFIRMED → ADMISSIBLE → STRUCTURED → DISPLAY_ELIGIBLE → SEARCHABLE → CANONICAL_PROPERTY`

## États canoniques

### 1. DISCOVERED

Une URL ou représentation a été découverte par une voie autorisée : OpenSERP, sitemap public, Common Crawl, flux partenaire/autorisé ou autre source enregistrée.

Ce compteur n'implique ni fraîcheur, ni validité métier, ni droit de publication.

### 2. NORMALIZED

L'URL a été canonicalisée : domaine, protocole, slash, paramètres non pertinents et variantes techniques traités selon les règles de normalisation.

### 3. UNIQUE_SEED

Une représentation logique unique après seed-level dedup.

Important : ce n'est pas encore un bien immobilier unique.

### 4. CONFIRMABLE

Le seed possède suffisamment de structure / signaux pour entrer dans une stratégie de confirmation sans violer les politiques source.

### 5. CONFIRMATION_ATTEMPTED

Au moins une tentative de confirmation autorisée a été exécutée.

Chaque tentative doit conserver :

- timestamp ;
- run ;
- méthode ;
- source ;
- outcome normalisé.

### 6. CONFIRMED

Une preuve indépendante suffisante confirme l'existence / identité de la représentation selon la politique de la lane utilisée.

`fresh_confirmed` doit être défini précisément comme un sous-état temporel de confirmation et non utilisé comme synonyme de `structured listing`.

### 7. ADMISSIBLE

Le candidat satisfait les règles d'admission métier et de sécurité requises pour devenir une représentation structurée.

### 8. STRUCTURED_LISTING

Une représentation structurée existe dans le modèle AkarFinder avec les attributs réellement observés / autorisés.

Aucune donnée manquante ne doit être inventée pour franchir ce gate.

### 9. DISPLAY_ELIGIBLE

Le résultat satisfait la politique d'affichage applicable à sa source et à son niveau de preuve.

### 10. SEARCHABLE

Le résultat est réellement récupérable par `/search` / index public selon les règles produit actuelles.

### 11. CANONICAL_PROPERTY

Une entité canonique Property Graph représente un bien/offre unique potentiel, éventuellement relié à plusieurs SourceOffers.

Ce niveau appartient à Property Graph V3 et ne doit jamais être confondu avec seed-level dedup.

---

## Outcomes de perte obligatoires

Chaque perte du funnel doit être classée dans un motif explicite, par exemple :

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
- outcome.

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
3. Combien ont déjà été tentés en confirmation ?
4. Quelle est la distribution exacte des outcomes ?
5. Quel est le yield par source / ville / type / transaction ?
6. Quelle part des 840 listings provient d'anciens pipelines hors seed reservoir ?
7. Combien sont display eligible et effectivement searchable ?

---

## Gate de sortie `DATA-FUNNEL-TRUTH-AUDIT-1`

Le gate est PASS seulement si :

- tous les compteurs majeurs ont une définition unique ;
- les populations sont réconciliées sans double comptage ;
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
