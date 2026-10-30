# AkarFinder — Parser V2 / PR #1105 : audit préliminaire des 42 workflows

**Date d'observation : 2026-10-30.** Source GitHub : `hraaaaf/Akarfinder`, branche `data/200k-fresh-parser-v2`, HEAD de référence `1274a2e5f2105cd43453cc96f347230cf2ed2b77`. PR #1105 DRAFT basée sur `data/neon-price-recovery-audit`.

## Goal / preuve / limites

- **Goal** : ne pas fusionner ni déclencher un collecteur non autorisé en confondant tests purs et accès aux portails.
- **Preuve réalisée** : inventaire via `list_pr_changed_filenames` et lecture du YAML des **42/42 workflows**. Chacun contient un événement `push` (sur la ou les branches configurées) ; certains comportent aussi `pull_request` et `workflow_dispatch`. Aucun `secrets.` explicite trouvé dans ces YAML. Cela **ne démontre pas** l'absence de réseau, de credentials indirects, ni d'écritures dans les scripts lancés.
- **Non prouvé dans cet audit** : légalité d'acquisition/photographies, absence de réseau des commandes appelées, résultats CI exacts de chacun, coverage national, activation production, déduplication physique.
- **Codes** : `KEEP_OFFLINE_TESTS` = tests offline à conserver; `KEEP_OFFLINE_CANDIDATE` = candidat à certifier offline; `REVIEW` = lire scripts/inputs/outputs avant décision; `BLOCK_LIVE` = bloquer exécution HTTP avant preuve des droits source; `REVIEW_AND_BLOCK_LIVE` = conserver bench offline, interdire version live. Ces statuts sont des **recommandations de tri**, pas la preuve que les workflows sont actuellement désactivés.
- **Important** : seule la partie du code qui ne fait aucun accès réseau ni DB peut être promue immédiatement, après tests. Robots, disponibilité publique, import dataset GitHub et agrégation tierce ne constituent pas une licence.

## Matrice 42/42 (classification provisoire)

| # | Workflow | Décision | Raisonnement / next |
|---|---|---|---|
| 1 | `.github/workflows/active-unique-shadow-v1.yml` | REVIEW | Shadow d'identité: confirmer entrée/sortie offline et absence d'accès DB/source |
| 2 | `.github/workflows/akarfinder-encrypted-raw-canary-v1.yml` | REVIEW | Contrat chiffrement RAW: isoler tests sans collecte externe |
| 3 | `.github/workflows/akarfinder-public-raw-collector-v1.yml` | KEEP_OFFLINE_TESTS | Tests du collecteur uniquement, aucune exécution source approuvée |
| 4 | `.github/workflows/akarfinder-raw-pulper-v1.yml` | KEEP_OFFLINE_TESTS | Tests extraction RAW à partir d'artefacts maîtrisés |
| 5 | `.github/workflows/avito-public-sitemap-canary.yml` | BLOCK_LIVE | Requête source Avito: autorisation/conditions à documenter |
| 6 | `.github/workflows/card-acquisition-ledger-v1.yml` | REVIEW | Ledger et provenance: vérifier les entrées, la persistence, les modes dispatch |
| 7 | `.github/workflows/cross-source-card-dedup-v1.yml` | KEEP_OFFLINE_CANDIDATE | Déduplication multi-source, réutilisable offline après tests |
| 8 | `.github/workflows/domio-card-detail-audit-12.yml` | BLOCK_LIVE | Accès fiches Domio non autorisé par cet audit |
| 9 | `.github/workflows/domio-linked-pagination-80.yml` | BLOCK_LIVE | Pagination Domio : source rights/access avant HTTP |
| 10 | `.github/workflows/domio-page2-canary.yml` | BLOCK_LIVE | Canary source HTTP : pas de relance avant gate |
| 11 | `.github/workflows/domio-pagination-resume-after-12.yml` | BLOCK_LIVE | Reprise réseau Domio : freeze tant que droits UNKNOWN |
| 12 | `.github/workflows/domio-public-card-canary.yml` | BLOCK_LIVE | Accès cartes Domio conditionné aux droits |
| 13 | `.github/workflows/feenway-canary81-evidence-ci.yml` | KEEP_OFFLINE_CANDIDATE | Tests et preuves d'archives, aucune certification publication |
| 14 | `.github/workflows/feenway-jsonld-mold-v1.yml` | KEEP_OFFLINE_TESTS | Moule JSON-LD offline, données sourcées distinctes |
| 15 | `.github/workflows/feenway-n01-raw-integrity-verification.yml` | REVIEW | SHA/RAW utile mais référence l'audit sitemap ; vérifier absence réseau |
| 16 | `.github/workflows/feenway-n01-sitemap-audit.yml` | BLOCK_LIVE | Script `feenway-n01-sitemap-audit.mjs` confirme `fetch()` des six sitemaps live FeenWay (8 MB max/XML) ; aucun téléchargement de fiche. Autorisation source non établie |
| 17 | `.github/workflows/feenway-primary-batch-v1.yml` | BLOCK_LIVE | Batch de fiches FeenWay : blocage live |
| 18 | `.github/workflows/feenway-primary-parser-v1.yml` | KEEP_OFFLINE_TESTS | Parser JSON-LD et fixtures uniquement |
| 19 | `.github/workflows/feenway-sitemap-inventory-v1.yml` | BLOCK_LIVE | Inventaire sitemap avec exécution à contrôler |
| 20 | `.github/workflows/github-freeze-full-field-recovery.yml` | REVIEW | Reconstruction d'artefacts GitHub, vérifier autorisation/données et déclencheur PR |
| 21 | `.github/workflows/github-freeze-parser-readiness-v2.yml` | REVIEW | Audit freeze à conserver si intégralement offline |
| 22 | `.github/workflows/kaynly-source-link-canary-v1.yml` | REVIEW | Source indirecte: origine et droits par annonce à confirmer |
| 23 | `.github/workflows/marocimmo-detail-evidence-v1.yml` | BLOCK_LIVE | Détails MarocImmo : vérification licence/terms |
| 24 | `.github/workflows/marocimmo-public-probe.yml` | BLOCK_LIVE | Probe réseau MarocImmo : gate source |
| 25 | `.github/workflows/marocimmo-sitemap-enumeration.yml` | BLOCK_LIVE | Sitemap MarocImmo : pas de copie implicite |
| 26 | `.github/workflows/mubawab-200k-certify-one-shot.yml` | BLOCK_LIVE | Historique et dénominateur, aucun nouveau crawl sans #1135 |
| 27 | `.github/workflows/mubawab-card-detail-audit-30.yml` | BLOCK_LIVE | Accès fiches Mubawab refusé sans licence |
| 28 | `.github/workflows/mubawab-card-scale-50.yml` | BLOCK_LIVE | Batch carte Mubawab, tests offline à séparer |
| 29 | `.github/workflows/mubawab-district-remainder-220.yml` | BLOCK_LIVE | Requête/restes quartiers Mubawab : gate |
| 30 | `.github/workflows/mubawab-linked-pagination-canary-v1.yml` | BLOCK_LIVE | Canary pagination source Mubawab : gate |
| 31 | `.github/workflows/mubawab-national-frontier-100.yml` | BLOCK_LIVE | Frontier nationale Mubawab : gate |
| 32 | `.github/workflows/mubawab-new-city-frontier-30.yml` | BLOCK_LIVE | Frontier villes Mubawab : gate |
| 33 | `.github/workflows/mubawab-parser-v2-benchmark.yml` | BLOCK_LIVE | YAML : téléchargement de l'artefact freeze GitHub puis étape `Run bounded live benchmark` lançant `mubawab-live-benchmark-v2.mjs` ; isoler `mubawab-freeze-adapter-v2.mjs` (offline) ; aucun HTTP Mubawab sans #1135 |
| 34 | `.github/workflows/mubawab-regional-categories-v1.yml` | BLOCK_LIVE | Exploration catégories Mubawab : gate |
| 35 | `.github/workflows/mubawab-regional-types-40.yml` | BLOCK_LIVE | Exploration types Mubawab : gate |
| 36 | `.github/workflows/mubawab-result-cards-first-pilot.yml` | BLOCK_LIVE | Pilote pages résultats Mubawab : gate |
| 37 | `.github/workflows/mubawab-verified-district-shards-120.yml` | BLOCK_LIVE | Shards quartiers Mubawab : gate |
| 38 | `.github/workflows/sarout-parser-v2-offline.yml` | KEEP_OFFLINE_CANDIDATE | YAML télécharge uniquement un artefact GitHub freeze ; `sarout-freeze-adapter-v2.mjs` utilise `readFileSync`/SHA et produit un `live-fetch-plan`, sans fetch source dans ce fichier. Vérifier dépendances, licences et CI avant portage |
| 39 | `.github/workflows/sarouty-card-boundary-v1.yml` | BLOCK_LIVE | Frontière de cartes Sarouty, accès source à qualifier |
| 40 | `.github/workflows/sarouty-card-fields-pilot.yml` | BLOCK_LIVE | Champs cartes Sarouty : gate |
| 41 | `.github/workflows/sarouty-public-card-canary.yml` | BLOCK_LIVE | Canary fiches Sarouty : gate |
| 42 | `.github/workflows/yakeey-card-canary-v1.yml` | BLOCK_LIVE | Source Yakeey et droits médias à qualifier |

## Ordre de mission d'un agent de reprise

1. Pour chaque YAML `push`, noter branches/paths ; retrouver le point d'entrée exact du script appelé et tous ses imports, `fetch/requests/curl/axios`, DB connecteurs, téléchargement images, archives, redirections/429, et les variables utilisées. **Ne jamais conclure « offline » depuis le nom du workflow.**
2. Pour chaque source, consigner `terms/licence/permissions` et `robots/access` séparément ; preuve de droits pour champs, images, stockage, conservation, publication, liens, retrait. Issue #1135 obligatoire pour Mubawab.
3. Isoler les tests et rapprocheurs purement offline dans une PR issue de `main` avec chemins stricts, pas de crawl. Vérifier sorties, fixtures, hashes et invariants.
4. Arrêter/neutraliser par changement dédié tout job live dont les droits ne sont pas prouvés ; interdire l'utilisation du `push` comme autorisation d'accès. Tests de non-régression path scoped, PR quick, main AFTER read-only.
5. Reprendre `N01` FeenWay seulement dans une voie autorisée, sans importer automatiquement les URL dans l'index public. Source de référence historique : `docs/handovers/parserNovembre.md` ; les 750/1720 pages observées et 63 364 URL d'un snapshot ne sont pas des biens actifs/certifiés.
6. Ne pas fermer #1105 avant transfert traçable des fonctions offline utiles, arbitrage source par source, conservation des preuves et choix humain de merge.

**Next exact** : inspecter les scripts exécutés par `mubawab-parser-v2-benchmark.yml`, `sarout-parser-v2-offline.yml` et `feenway-n01-sitemap-audit.yml`; ensuite préparer split tests hors réseau / jobs live permis. Aucun déploiement Vercel, aucune écriture DB.

## Revue source de trois exécutions — preuve additionnelle

- `mubawab-parser-v2-benchmark.yml` : source principale du risque, car la dernière étape lance effectivement `scripts/data/mubawab-live-benchmark-v2.mjs`; `mubawab-freeze-adapter-v2.mjs` est seulement une construction offline de plan de fetch (pas une autorisation). **Rester BLOCK_LIVE #1135.**
- `sarout-parser-v2-offline.yml` : `curl` sert au téléchargement d'un artifact GitHub `10910779576`, pas à Sarout. L'adaptateur inspecté lit le freeze local, calcule les SHA-256 et écrit des fichiers locaux, dont un plan de futures requêtes. Le `live-fetch-plan` n'est pas exécuté par cet adaptateur. **KEEP_OFFLINE_CANDIDATE**, pas une autorisation de collecte Sarout.
- `feenway-n01-sitemap-audit.yml` : étape lance bien `fetch(https://www.feenway.com/sitemaps/listings-0..5.xml)`. C'est un audit réseau, même s'il ne télécharge pas les fiches et n'écrit pas en DB. **BLOCK_LIVE** en attendant évaluation des conditions source.
- Seules les trois chaînes ci-dessus ont été ouvertes jusqu'au script exécuté ; les 39 autres restent des recommandations d'après YAML, pas un audit complet des imports transitifs.
