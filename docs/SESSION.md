# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot actif : DATA-1.3B — Common Crawl URL Index Live Evidence**

Ce fichier est le handover opérationnel court du projet. L’historique détaillé reste dans Git, les PR et les preuves techniques. `docs/ROADMAP.md` reste l’unique roadmap canonique.

## Main canonique

- `main` inclut la roadmap DATA consolidée ;
- dernier merge DATA-1 : **PR #324 — DATA-1.3A Common Crawl URL Index discovery contract** ;
- merge commit : `3bd7ce6d6db306b3927581b743676eedc955df2f` ;
- aucune migration DATA-1 ;
- aucune écriture Source Registry automatique ;
- aucun bypass.

## Lots DATA-1 acquis

### DATA-1.1 — Domain Census Core ✅

PR **#322**, mergée.

- core déterministe/offline ;
- normalisation URL/domain ;
- agrégation providers, dates, villes et signaux techniques ;
- états Registry explicites ;
- fail-closed sur preuves contradictoires ;
- aucune permission ou policy inférée ;
- adaptateur B3 `reserve_unregistered_source` ;
- priorité de revue `HIGH / MEDIUM / LOW / NOISE` ;
- gate CI dédiée.

### DATA-1.2 — Existing Reserve Census ✅

PR **#323**, mergée.

Snapshot Production read-only du 2026-08-07 :

- **37 009** lignes = **37 009 URLs distinctes** dans `reserve_unregistered_source` ;
- **7 051 domaines distincts** ;
- **554 HIGH / 9 280 URLs** ;
- **429 MEDIUM / 4 880 URLs** ;
- **6 050 LOW / 17 468 URLs** ;
- **18 NOISE / 5 381 URLs** ;
- premier batch prioritaire : **983 domaines HIGH + MEDIUM**.

La réserve prouve que la découverte existe déjà à grande échelle ; le goulot prioritaire devient la qualification et la policy.

### DATA-1.3A — Common Crawl URL Index Contract ✅

PR **#324**, mergée avec **19/19 workflows verts**.

- ne remplace pas les harvesters CDX existants ;
- vise les hosts inconnus du Census via le URL Index Parquet ;
- crawl initial : `CC-MAIN-2026-25` ;
- lane A : `MA_TLD_REAL_ESTATE` ;
- lane B : `MOROCCO_EXTERNAL_REAL_ESTATE` ;
- réutilise `ALL_ACQUISITION_CITIES` ;
- SQL reproductible + manifest `warcFetchAllowed=false` ;
- rapport `KNOWN_TO_CENSUS / NEW_TO_CENSUS` ;
- tout candidat reste `UNREVIEWED` avec `effectivePolicy=null` ;
- aucun WARC fetch, aucune ingestion, aucune nouvelle dépendance produit.

## Doctrine DATA active

Invariant :

`DISCOVERED ≠ AUTHORIZED ≠ INGESTIBLE ≠ DISPLAYABLE`

Pipeline de qualification :

`DISCOVERY → CENSUS → SOURCE REVIEW → POLICY → CONNECTOR CANDIDATE → INGESTION/INDEXATION SI ÉLIGIBLE`

Une capacité technique ou un résultat Common Crawl ne vaut jamais autorisation.

## État produit acquis

- Accueil P1 ✅
- Neuf P1 ✅ — score 9,1/10
- Acheter P1 ✅ — score 9,1/10
- Louer P1 ✅ — score 9,0/10
- Mon Projet P1A ✅ — PR #314
- Mon Projet P1B ✅ — PR #318
- Source Registry v2 ✅
- Freshness Engine ✅
- Discovery Expansion B3 ✅
- Coverage Gap Auditor ✅
- Partner Feed B3.4.x ✅
- DATA-1.1 / 1.2 / 1.3A ✅

## Lot actif — DATA-1.3B

Objectif : exécuter réellement les deux requêtes URL Index définies par DATA-1.3A avec un moteur compatible Parquet/Common Crawl, puis mesurer le gain net du Census.

Preuves obligatoires :

- moteur utilisé : Athena, DuckDB ou Spark ;
- crawl exact ;
- SQL exact ;
- volume scanné/coût si applicable ;
- hosts lane A / lane B ;
- overlap avec les **7 051 domaines DATA-1.2** ;
- nombre net de `NEW_TO_CENSUS` ;
- top nouveaux hosts par volume de signal ;
- échantillon de faux positifs ;
- confirmation : aucun WARC fetch.

## Prochaine action exacte

1. ouvrir une branche dédiée `DATA-1.3B` depuis le `main` courant ;
2. exécuter `01-ma-tld-real-estate.sql` sur `CC-MAIN-2026-25` ;
3. exécuter ensuite `02-morocco-external-real-estate.sql` ;
4. importer les agrégats dans le reporter DATA-1.3A ;
5. soustraire les domaines déjà connus du Census ;
6. produire le nombre net `NEW_TO_CENSUS` et le top des nouveaux hosts ;
7. auditer un échantillon de faux positifs avant toute suite ;
8. si le rendement est élevé, poursuivre DATA-1.4 Web Data Commons ;
9. si l’overlap est très élevé, concentrer l’effort sur la qualification des **983 HIGH/MEDIUM** déjà présents ;
10. ne créer/modifier aucune policy Source Registry avant DATA-1.5/1.6 et une revue explicite.
