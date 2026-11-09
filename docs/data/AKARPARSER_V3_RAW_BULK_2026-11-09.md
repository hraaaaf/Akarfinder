# AkarParser V3 — ingestion privée d'annonces brutes par lots (09/11/2026)

## GOAL / SUCCESS / PROOF
**Goal :** convertir 10, 100, 1 000 ou davantage d'annonces brutes HTML, JSON, JSONL, CSV en fiches structurées avec ville, quartier, prix MAD, superficie, type, transaction, détails, fraîcheur revendiquée et score interne sur 100.

**Périmètre V3.0 :** `scripts/acquisition/akarparser_v3_raw_bulk.py` s'appuie sur le normaliseur V2 et ajoute une ingestion de dossiers/fichiers, lecture HTML sans exécution de scripts, métadonnées JSON-LD et champs imbriqués, extraction prudente de valeurs explicites, provenance par chemin d'entrée, segmentation statuts, suivi de couverture et compteur d'erreurs. Il est **offline**, ne scrape pas, ne contacte pas de service tiers et ne peut publier ni écrire Neon.

**Success logiciel actuellement vérifié :** 13/13 tests propres à V3 (y compris 10/100/1 000 fixtures synthétiques), 69/69 tests V2 non régressifs, `python -m py_compile` ; test fumée V3 sur **1 000 lignes réelles mais déjà structurées** du jeu Q1E : 1 000 traitées, couverture ville 1 000, quartier 600, prix MAD 548, surface 574, type 1 000, transaction 1 000 ; 390 `complete_requires_freshness`, 577 `partial`, 33 `quarantine`, **0 `ready_internal`**. Ces lignes **ne sont pas des pages brutes** : elles ne démontrent aucune précision d'extraction HTML réelle.

**Quality gates :** score qualité interne 0–100 fondé sur présence de champs et date revendiquée, pas confiance statistique ni probabilité de vérité. `recent_timestamp_claim` ne démontre pas l'activité commerciale actuelle. `ready_internal` ne vaut jamais autorisation produit. Publication, Neon product, droit de réutilisation, preuve de fraîcheur indépendante et unicité intersources restent séparés. Les champs absents restent absents, sans valeur inventée.

## Exécution Windows privée

Dans un worktree propre ayant V3 disponible :

```powershell
$input = 'C:\chemin-prive\annonces-brutes'
$out = 'C:\chemin-prive\sorties-v3-nouvelles'
python scripts/acquisition/akarparser_v3_raw_bulk.py --input "$input" --out "$out" --as-of '2026-11-09T12:00:00Z'
```

Entrées : un fichier `.jsonl`, `.jsonl.gz`, `.json`, `.csv`, `.csv.gz`, `.html` ou dossier privé contenant ces fichiers. N'utiliser que des archives/pages dont l'usage est autorisé. Ne pas enregistrer les captures ou pages brutes dans GitHub. Le script produit des sorties privées gzip `records`, `ready_internal`, `review`, `quarantine`, `errors` et un `aggregate_report.json` avec comptes, présence de champs, répartition des scores et SHA. Toujours utiliser un dossier de sortie nouveau.

## Prochaine validation indispensable

1. Collecter dans un dossier privé un **petit corpus autorisé** de pages originales datées et de JSON bruts provenant de plusieurs formats/portails, avec vérité terrain par champ et droits vérifiés.
2. Vérifier les extractions sur ces pages **brutes**, pas seulement sur les lignes Q1E déjà structurées. Mesurer couverture et précision séparément, par portail ; démontrer ville, quartier, prix, m², transaction, type, date, images et autres détails.
3. Corriger en priorité les pertes de champs, unités incohérentes, faux positifs, dates non prouvées et déduplication interbatch ; ajouter des tests de non-régression.
4. Prévoir le packaging en volume (batches et manifestes append-only), ressources et sécurité avant de déclarer des milliers de pages réelles « ready ».
5. Mettre à jour Notion DATA MASS et la roadmap en gardant séparés les 9 990 historiques détaillés et les **0 nouveaux certifiés** issus de V3.

## Sécurité et décisions

PR isolée de la Draft #1188 ; aucun merge, déploiement Vercel, écriture Neon ni publication autorisé. 10/100/1 000 prouvés sur fixtures ; quantité plus importante et précision en conditions réelles encore non prouvées.

**Next exact :** intégrer et faire passer CI, puis constituer corpus multiportail de pages brutes et exécuter premier benchmark qualité annoté.
