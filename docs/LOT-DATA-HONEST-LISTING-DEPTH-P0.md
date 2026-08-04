# LOT DATA — Honest Listing Depth P0

**Statut : ACTIF**  
**Date de départ : 2026-08-04**  
**Issue : #254**  
**Branche : `data/honest-listing-depth-p0`**

## 1. Décision

AkarFinder passe officiellement de **UX-first** à **DATA-first**.

Jusqu'à amélioration significative de la profondeur et de la qualité :

- aucune nouvelle refonte UX générale ;
- aucune feature périphérique ;
- uniquement les bugs bloquants sur les surfaces existantes ;
- priorité absolue à la profondeur de vraies annonces, la diversité des sources, la fraîcheur et la vérité économique.

## 2. North Star

La métrique principale est :

> nombre de documents `LISTING` classifiés `real_estate_likely` et `eligible_primary` ou `eligible_secondary`.

Le total des documents Thin Index n'est pas une métrique de profondeur publique.

## 3. Baseline connectée

Capture Supabase canonique en lecture seule le 2026-08-04 :

| Indicateur | Valeur |
|---|---:|
| Thin Index total | 56 777 |
| LISTING publiques éligibles | **7 483** |
| Avec ville | 7 483 |
| Avec type | 7 158 |
| Avec intention | 7 188 |
| Avec prix | 852 |
| Avec surface | 2 085 |
| Prix + surface | 717 |
| `property_listings` | 4 555 |
| `listing_sources` | 4 560 |
| `property_clusters` | 4 416 |
| Observations | 2 823 |

Le script de référence est :

`scripts/audits/honest-listing-depth-baseline.sql`

## 4. Diagnostic

Le volume brut est déjà important, mais la conversion vers des annonces publiques reste faible :

- 56 777 documents conservés ;
- seulement 7 483 vraies pages annonce publiques ;
- 53 522 seeds restent au statut `seed_only` ;
- seulement 3 255 sont `fresh_confirmed` ;
- 717 annonces seulement possèdent prix et surface comparables ;
- quatre domaines concentrent presque tout le corpus public.

Le problème prioritaire est donc le funnel :

`seed → URL canonique net-new → immobilier → LISTING → eligible → fraîche → publiable`

## 5. Séquence d'exécution

### Étape A — Baseline et rendement par canal

Mesurer séparément :

- Common Crawl CDX ;
- sitemaps publics ;
- Serper/OpenSERP ;
- feeds directs ;
- imports partenaires.

Pour chaque canal :

- seeds examinés ;
- URLs net-new ;
- taux d'URL canonique valide ;
- taux immobilier ;
- taux `LISTING` ;
- taux display eligible ;
- taux fresh confirmed ;
- coût et durée ;
- principales raisons de rejet.

### Étape B — Priorisation des sources

Classer les sources sur :

1. statut Source Registry ;
2. potentiel net-new ;
3. diversité géographique ;
4. qualité du type et de l'intention ;
5. prix/surface disponibles ;
6. fraîcheur ;
7. stabilité et coût d'acquisition.

### Étape C — Première campagne bornée

Lancer uniquement sur les sources et canaux conformes :

- budget explicite ;
- cadence bornée ;
- circuit breaker ;
- aucune tentative de bypass ;
- rapport avant/après ;
- rollback et suppression du lot identifiables.

### Étape D — Certification du delta

Le LOT n'est validé que sur :

- delta net-new de LISTING publiques ;
- delta par source et ville ;
- taux de catégories/ambiguïtés admises : zéro ;
- provenance complète ;
- canonical URL unique ;
- aucune régression de Search Truth.

## 6. Première cible

Produire le funnel réel des trois canaux déjà majoritaires et identifier les cinq meilleures opportunités de croissance conformes.

Aucune cible arbitraire de volume ne sera fixée avant cette mesure de rendement.

## 7. Gates

- aucune page catégorie ou recherche comptée comme annonce ;
- aucune verticale non immobilière publiée ;
- aucune source activée sans règle explicite ;
- aucune image, contact ou donnée absente inventée ;
- aucune collecte massive non bornée ;
- une responsabilité principale par PR ;
- preuve connectée obligatoire pour tout chiffre annoncé.

## 8. Définition de terminé

- baseline reproductible mergée ;
- funnel par canal documenté ;
- sources prioritaires justifiées ;
- première campagne bornée exécutée ;
- delta LISTING public vérifié ;
- CI et Search Truth verts ;
- documentation canonique mise à jour.
