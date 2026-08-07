# DATA-1.3 — Common Crawl URL Index Discovery

**Statut : DATA-1.3A — contrat d’exécution / parser / CI**  
**Mode : discovery-only / metadata-only**  
**Crawl cible initial : `CC-MAIN-2026-25`**

Ce lot complète les harvesters Common Crawl déjà présents ; il ne les remplace pas.

## 1. Pourquoi une nouvelle couche

Le repo possède déjà des harvesters CDX ciblés sur des domaines **déjà connus et autorisés par Source Registry**. Ils servent à mesurer la profondeur d’un réservoir ou extraire des seeds sur un domaine déterminé.

DATA-1.3 répond à une autre question :

> Quels hosts immobiliers liés au Maroc existent dans Common Crawl mais ne sont pas encore présents dans notre Census ?

Pour ce workload bulk, on utilise le **Common Crawl URL Index** (Parquet) et non une boucle massive sur l’API CDX.

Références officielles vérifiées le 2026-08-07 :

- URL Index : `https://commoncrawl.org/url-index`
- Latest Crawl : `https://commoncrawl.org/latest-crawl`
- table S3 : `s3://commoncrawl/cc-index/table/cc-main/warc/`

Le URL Index est une table de métadonnées. DATA-1.3 ne sélectionne aucun `warc_filename`, offset ou length et ne télécharge aucun contenu WARC.

## 2. Deux lanes de discovery

### Lane A — `MA_TLD_REAL_ESTATE`

Scope : hosts sous registry suffix `.ma`.

Conditions :

- crawl explicite ;
- `subset = 'warc'` uniquement comme partition de l’index ;
- `fetch_status = 200` ;
- host/registered-domain non nuls ;
- comptage des URLs dont host/path porte un signal immobilier explicite.

Sortie : uniquement les hosts avec au moins `minSignalPages` pages signalées.

Cette lane permet de retrouver un domaine au nom générique lorsque ses chemins sont immobiliers.

### Lane B — `MOROCCO_EXTERNAL_REAL_ESTATE`

Scope : hosts hors `.ma`.

Conditions supplémentaires :

- signal immobilier dans host/path ;
- **et** signal géographique Maroc dans host/path : `maroc`, `morocco` ou une ville issue de `ALL_ACQUISITION_CITIES` existant.

La taxonomie nationale n’est pas dupliquée.

`Salé` est volontairement exclu comme token latin isolé de cette regex car sa normalisation `sale` collisionne avec le terme transactionnel anglais `sale` ; cette exclusion réduit les faux positifs globaux.

## 3. Outputs SQL canoniques

Commande :

```bash
npx tsx scripts/audits/data-1-commoncrawl-url-index-plan.ts \
  --out-dir .tmp/data-1-3-plan \
  --crawl CC-MAIN-2026-25 \
  --min-signal-pages 1
```

Outputs :

- `01-ma-tld-real-estate.sql` ;
- `02-morocco-external-real-estate.sql` ;
- `manifest.json` avec `executionMode = URL_INDEX_METADATA_ONLY` et `warcFetchAllowed = false`.

## 4. Contrat des résultats

Chaque ligne agrégée doit fournir :

- `lane` ;
- `domain` = host exact ;
- `registered_domain` ;
- `indexed_pages` ;
- `real_estate_signal_pages` ;
- `latest_fetch_at` ;
- `sample_url`.

Après exécution, `buildCommonCrawlUrlIndexReport` soustrait les domaines déjà connus du Census et produit :

- `KNOWN_TO_CENSUS` ;
- `NEW_TO_CENSUS`.

Tous restent :

- `reviewState = UNREVIEWED` ;
- `effectivePolicy = null`.

## 5. Invariants

Un hit Common Crawl n’est jamais :

- une permission ;
- une preuve qu’une annonce est encore active ;
- une inscription Source Registry ;
- une preuve de droit de réutilisation ;
- une éligibilité à l’ingestion ;
- une éligibilité à l’affichage.

Pipeline :

`URL INDEX HIT → CENSUS CANDIDATE → SOURCE REVIEW → POLICY → CONNECTOR CANDIDATE`

et jamais :

`URL INDEX HIT → INGESTION`.

## 6. Découpage d’exécution

### DATA-1.3A — Query Contract & Offline Report

Livrables :

- générateur SQL des deux lanes ;
- taxonomie nationale réutilisée ;
- parsing/validation déterministe des agrégats ;
- soustraction known/new ;
- rapport JSON/Markdown ;
- tests ;
- smoke CI ;
- aucune dépendance Athena/DuckDB ajoutée au produit.

### DATA-1.3B — Live URL Index Evidence

À exécuter après merge 1.3A avec un moteur de requête compatible URL Index (Athena/DuckDB/Spark) dans un environnement dédié.

Preuves obligatoires :

- crawl exact ;
- SQL exact ;
- volume scanné/coût si Athena ;
- nombre de hosts lane A/B ;
- overlap avec les 7 051 domaines DATA-1.2 ;
- nombre net de `NEW_TO_CENSUS` ;
- top nouveaux hosts par `real_estate_signal_pages` ;
- revue de faux positifs ;
- aucun fetch WARC.

DATA-1.3 n’est pas considéré terminé avant cette preuve live.

## 7. Gate vers DATA-1.4/1.5

Le rendement décide la suite :

- si Common Crawl apporte beaucoup de nouveaux hosts : intégrer les nouveaux candidats au Census puis poursuivre Web Data Commons ;
- si l’overlap est très élevé : privilégier la qualification des 983 HIGH/MEDIUM déjà découverts ;
- aucune nouvelle source n’est activée avant DATA-1.5/1.6 et la Source Registry.
