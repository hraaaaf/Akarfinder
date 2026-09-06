# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-09-06**  
**Statut : MARKET COVERAGE — M250K FROZEN / CANDIDATE LAKE + CLUSTERING ACTIVE**

> **SOURCE UNIQUE DE VÉRITÉ GLOBALE.** Ce fichier est la seule boussole globale AkarFinder. `docs/SESSION.md` n'est qu'un handover. Les autres specs restent locales à leur périmètre.

## 1. NORTH STAR

Construire le Property Graph le plus large possible du marché immobilier marocain à partir de surfaces publiques récupérables et traçables.

- **Goal principal M200K : >=200 000 représentations candidates exploitables — ATTEINT.**
- **Stretch M250K : >=250 000 candidates L0/L1 — ATTEINT ET FIGÉ À 253 372.**
- Mesurer séparément représentations source, clusters probablement uniques et annonces probablement actives.
- Accepter le bruit en L0/L1, le classer ensuite.
- Les preuves historiques restent L0 avec provenance/date ; elles ne deviennent jamais `active` ou `fresh` sans preuve récente.

Pipeline : `DISCOVER -> RAW EVIDENCE -> NORMALIZE -> EXACT DEDUPE -> CANDIDATE LAKE -> CLUSTER -> FRESHNESS -> SEARCH ELIGIBILITY`.

## 2. NON-NÉGOCIABLES

- respecter `robots.txt` et les limites publiques ;
- aucun contournement login/CAPTCHA/paywall/anti-bot/API privée ;
- provenance/evidence obligatoire ;
- `candidate != active` et `URL != property unique` ;
- aucun `100 %` sans dénominateur ;
- déduplication non destructive ;
- CI pending ne bloque pas les lanes indépendantes ;
- **0 Vercel sans autorisation explicite** ;
- **0 écriture Supabase/prod sans gate humain séparé**.

## 3. SCOREBOARD CERTIFIÉ

| Source/lane | Représentations candidates retenues | Statut | Preuve |
|---|---:|---|---|
| Avito indirect — AlerteImmo/Kaynly/CC union | **19 739** | ✅ | run `33971383335`, artifact `9971118875` |
| Akaar `/listing/...` | **76 843** | ✅ | run `33984287820`, artifact `9974670013` |
| Mubawab FULL robots-safe shard union | **18 445** | ✅ CLOSED | run `33964834762`, artifact `9969651653` |
| MarocAnnonces source-first residential union | **10 000** | ✅ CLOSED | run `33739495442`, artifact `9888335708` |
| Sarouty property-detail sitemaps | **5 064** | ✅ CLOSED | run `33765427351`, artifact `9897323745` |
| Agenz source-first partial safe enumeration | **4 466** | ✅ PARTIAL | run `33764930794`, artifact `9898224274` |
| DarAgadir + LSF + Aykana canonical-link public-sitemap rows | **6 270** | ✅ HISTORICAL L0 | PR `#223`, merge `686f71657c3d683360990d3125c19034086d83c2` |
| Aykana MASS-X5 exact-net-new addition | **509** | ✅ HISTORICAL L0 | MASS-X5 run `31762998799` |
| Atlas + Masaken + SoukImmobilier Common Crawl candidates | **2 163** | ✅ HISTORICAL L0 | MASS-X5 run `31762998799` |
| Mouldar Common Crawl candidates | **1 081** | ✅ HISTORICAL L0 | MASS-X5 run `31762998799` |
| Promo Immo Marrakech Common Crawl candidates | **943** | ✅ HISTORICAL L0 | MASS-X5 run `31762998799` |
| Kawtar Immobilier Common Crawl candidates | **188** | ✅ HISTORICAL L0 | MASS-X5 run `31762998799` |
| DATA-4.9B six-source structural detail URLs | **2 326** | ✅ STRUCTURAL L0 | run `31370449455`, exact-head proof |
| Domio listing-like URLs | **2 020** | ✅ PARTIAL | run `33984423190`, artifact `9974714576` |
| MarrakechRealty current `source_offer_seeds` | **1 944** | ✅ CURRENT L0 | Supabase read-only snapshot 2026-09-05 |
| Barnes Marrakech current `source_offer_seeds` | **282** | ✅ CURRENT L0 | Supabase read-only snapshot 2026-09-05 |
| 1immo current `source_offer_seeds` | **201** | ✅ CURRENT L0 | Supabase read-only snapshot 2026-09-05 |
| Sakane current `source_offer_seeds` | **191** | ✅ CURRENT L0 | Supabase read-only snapshot 2026-09-05 |
| Milkiya current `source_offer_seeds` | **131** | ✅ CURRENT L0 | Supabase read-only snapshot 2026-09-05 |
| Expat current `source_offer_seeds` | **83** | ✅ CURRENT L0 | Supabase read-only snapshot 2026-09-05 |
| 1000-annonces current `source_offer_seeds` | **66** | ✅ CURRENT L0 | Supabase read-only snapshot 2026-09-05 |
| Housing.place current `source_offer_seeds` | **22** | ✅ CURRENT L0 | Supabase read-only snapshot 2026-09-05 |
| B3 strict Morocco reserve — `.ma` + immobilier/classified signal, exact anti-overlap | **5 797** | ✅ DISCOVERY-ONLY L0 | Supabase read-only replay of DATA-1.2 classifier, 2026-09-05 |
| ImmoDirect `/property/...` | **4** | ✅ PARKED faible rendement | run `33985219822`, artifact `9974939355` |
| Yakeey purchase + rental exact source IDs | **82** | ✅ L0 EXACT IDs | runs `33989989300` + `33990176467`, purchase artifact `9976337671` |
| MASS-X2 conservative additive — Jibril + SW Immobilier + Loco | **73** | ✅ HISTORICAL L0 | exact anti-overlap read-only 2026-09-06 |
| MASS-1 Source Factory exact additive hors lanes existantes | **1 613** | ✅ HISTORICAL L0 | run `34029546664`, artifact `9988296190` |
| 1immo historical detail exact delta au-dessus des 201 seeds | **3 471** | ✅ HISTORICAL L0 | run `34030138761`, artifact `9988514932` |
| Agenz historical detail exact delta au-dessus des 4 466 directes | **3 819** | ✅ HISTORICAL L0 | artifact `9989328673` + baseline `9898224274`, exact ID set-diff 2026-09-06 |
| Mubawab — RealEstateBuddy public GitHub dataset exact ID delta | **21 374** | ✅ HISTORICAL PUBLIC-DATASET L0 | run `34038898808`, artifact `9991042950` |
| Mubawab — HichamBenelmahi public GitHub dumps exact ID delta vs union précédente | **17 394** | ✅ HISTORICAL PUBLIC-DATASET L0 | run `34039440480`, artifact `9991207598` |
| Avito — HichamBenelmahi public GitHub CSV exact ID delta vs 19 739 baseline | **22 381** | ✅ HISTORICAL PUBLIC-DATASET L0 | run `34039440480`, artifact `9991207598` |
| Mubawab — MarwaneMLE public GitHub exact ID delta vs 57 213 union | **4 089** | ✅ HISTORICAL PUBLIC-DATASET L0 | run `34040109352`, artifact `9991403015` |
| Mubawab — BenTouhami + Agadir + Loubaris public GitHub sequential delta | **15 514** | ✅ HISTORICAL PUBLIC-DATASET L0 | run `34040263021`, artifact `9991447841` |
| Avito — public GitHub repo batch sequential delta vs 42 120 union | **4 784** | ✅ HISTORICAL PUBLIC-DATASET L0 | run `34040405000`, artifact `9991488198` |

### Union L0/L1 minimale mesurée

**253 372 représentations candidates exactes par identité source/ID ou source/URL.**

Progression certifiée depuis le snapshot 158 778 :

`158 778 + 82 + 73 + 1 613 + 3 471 + 3 819 + 21 374 + 17 394 + 22 381 + 4 089 + 15 514 + 4 784 = 253 372`.

**M250K est dépassé de 3 372 représentations candidates : 253 372 / 250 000 = 101,35 %. M200K et M250K sont CLOSED.**

### FREEZE M250K — 2026-09-06

- **Union certifiée figée : 253 372 représentations L0/L1.**
- **Union Mubawab exacte : 76 816 IDs source.**
- **Union Avito exacte : 46 904 IDs source.**
- Expansion publique GitHub certifiée au-dessus des baselines déjà comptées : **+85 536 exact-net-new**.
- Preuve de fermeture finale : run `34040405000`, artifact `9991488198`, SHA256 `63906e15b14fc772ddd4d49f0c05bee236e95ab478ad989ba56bfe32208f6543`.
- Contrat de freeze : le compteur **253 372** ne change plus qu'avec un manifeste d'identités exactes et un `set-diff` contre l'union figée. Aucun total marketing, aucune ligne sans identité source, aucun overlap supposé ne peut l'augmenter.
- Le freeze porte sur le **compteur de représentations candidates**, pas sur `probable_unique`, `active` ou `fresh`.

MASS-X5 finale (`31762998799`) certifie globalement `candidate_unique=51 169`, `exact_overlap=36 732`, `exact_net_new=14 437`. **Les 14 437 ne sont pas additionnés en bloc** car plusieurs domaines chevauchent déjà le scoreboard. Seuls les volumes dont l'absence ou le net-new est prouvé sont retenus.

DATA-40K Historical 2025, run `30126275406`, a récolté **28 248 seeds qualifiées** sur 10 domaines / 8 indexes Common Crawl et en a inséré **26 777 net-new à l'époque**. Ce total historique **n'est pas ajouté en bloc aujourd'hui** : les domaines Avito, Mubawab, Agenz, Sarouty, DarAgadir, Mouldar, Masaken, SoukImmobilier et Atlas sont déjà représentés dans le scoreboard courant. Seuls les domaines actuellement absents du scoreboard et présents dans `source_offer_seeds` sont ajoutés séparément, soit **2 920** URL identities.

DATA-1.2 B3 reserve contient toujours **37 009** URLs exactes ; **36 284** ne chevauchent pas `source_offer_seeds`. Le classifier historique HIGH donne 9 124 URLs, mais ce lot contient aussi des domaines immobiliers étrangers. Le scoreboard n'en retient donc que le sous-ensemble **strict Morocco** : domaine `.ma` + signal immobilier/classified explicite, soit **5 797 URLs sur 114 domaines**, après anti-overlap exact contre `source_offer_seeds`. Ce lot reste **L0 discovery-only** : aucune autorisation, fraîcheur ou activité n'est inférée.

Le run non-Factory `34036331806` a trouvé **1 938** autres représentations exact-additive hors seeds/B3/lanes, mais **459 TikTok + 454 Facebook** dominent le lot. **Ces 1 938 ne sont pas incluses dans le compteur strict 253 372** tant qu'un filtre qualité source n'est pas appliqué.

Les lignes historiques/structurelles/public-dataset sont comptées **L0 uniquement** avec provenance ; elles ne sont pas déclarées actives, fraîches ou autorisées à l'affichage.

Ce n'est **pas** 253 372 biens uniques actifs. Les sources différentes et les cohortes temporelles peuvent représenter le même bien ; le recouvrement physique sera traité au clustering.

## 4. DÉTAILS / DÉCISIONS DE LANE

### Mubawab — DIRECT FULL CLOSED + PUBLIC DATASET EXPANSION
Run direct `33964834762` ✅ : **3 174/3 174 shards**, **18 445 IDs uniques**, queue=0, zeroDbWrites=true.

Expansion indirecte publique 2026-09-06 :
- `hakkache/RealEstateBuddy:data/Clean_Data_Step2.csv` : **23 796 lignes**, **22 011 IDs Mubawab distincts**, overlap exact direct **637**, **+21 374 net-new** ; run `34038898808`, artifact `9991042950`, dataset SHA256 `9d32451a56ba7977b7365d5ac06366ad05e7c059696ce3476b25737e3d445558`, artifact SHA256 `97936f5668a11f9fdc3a5b5f6ba3c32bb00a592883a8b4efaa95b0d6579e67ea`.
- `HichamBenelmahi/analyse-des-tendances-immobili-res-` : **20 459 IDs Mubawab distincts** dans les dumps publics vente/location ; baseline union déjà comptée **39 819 IDs**, overlap exact **3 065**, **+17 394 net-new** ; run `34039440480`, artifact `9991207598`.
- `MarwaneMLE/morocco-appartements-price` : **8 745 IDs** trouvés, overlap **4 656** contre union 57 213, **+4 089 net-new** ; run `34040109352`, artifact `9991403015`, artifact SHA256 `80d1123e5f05b1d2f102a5767c85e202cb90283d469851b5599f9858e5ccdea2`.
- Batch `BenTouhami-MR` + `hassanelq` + `Loubaris` : **+15 514 net-new séquentiels** contre union Mubawab 61 302 ; BenTouhami +14 519, Agadir +486, Loubaris +509 ; run `34040263021`, artifact `9991447841`, artifact SHA256 `79738f2c2d5af5219bd3c5aafcaa2f61042105bfb6e33e747a4dcc5e8c15e2a4`. Union Mubawab exacte résultante : **76 816 IDs**.

Ces expansions ne font **aucune requête Mubawab** : GitHub public + artifacts AkarFinder uniquement. `sourceSiteFetches=0`, `databaseWrites=0`. Elles sont historiques L0, pas des preuves de fraîcheur.

### Avito — INDIRECT BASELINE + PUBLIC DATASET EXPANSION
Baseline indirecte certifiée : **19 739 IDs** via run `33971383335`, artifact `9971118875`.

Les CSV publics du repo `HichamBenelmahi/analyse-des-tendances-immobili-res-` contiennent :
- location : **17 671 IDs Avito distincts** ;
- vente : **5 516 IDs Avito distincts** ;
- union : **23 187 IDs** ;
- exact overlap avec le baseline 19 739 : **806** ;
- **exact net-new : 22 381**.

Preuve baseline/dump Hicham : run `34039440480`, artifact `9991207598`, artifact SHA256 `9a236ad31ffde306ceda8458edc9f8bce789e37affcbe690a3276e8dbc4d66e5`. Expansion publique supplémentaire : batch GitHub run `34040405000` -> **+4 784 IDs exact-net-new** (achrafdigital +1 625 ; Rabat Immobilier Prediction +3 159), artifact `9991488198`, SHA256 `63906e15b14fc772ddd4d49f0c05bee236e95ab478ad989ba56bfe32208f6543`. Union Avito exacte résultante : **46 904 IDs**. `sourceSiteFetches=0`, `databaseWrites=0`. Historique L0 uniquement.

### MarocAnnonces — FULL SOURCE-FIRST CLOSED
Run `33739495442` ✅ : **546 pages**, **547 requêtes**, **10 000 IDs uniques**, queueRemaining=0, aucun cap atteint, zeroDbWrites=true. Toute nouvelle reprise doit rester fail-closed selon robots courant.

### Sarouty — FULL PROPERTY SITEMAPS CLOSED
Run `33765427351` ✅ : 6/6 property-detail sitemaps déclarés, **5 064 IDs uniques**, 8 requêtes total, aucun cap, zeroDbWrites=true.

### Agenz — PARTIAL DIRECT + HISTORICAL DELTA
Run direct `33764930794` : **4 466 IDs uniques** observés sur 430 pages avant `hard_block`, queueRemaining=1 397. Arrêt de sécurité correct, aucun retry/bypass, zeroDbWrites=true.

Export historique read-only `34032779387` / artifact `9989328673` : **4 283 fiches historiques**. Set-diff exact contre les 4 466 URLs/IDs directes : overlap **464**, **+3 819 représentations historiques additives**. Elles restent L0 historique et ne rendent pas la lane direct complète.

### Yakeey — EXACT IDs L0
Achat run `33989989300` ✅ : **66 IDs** sur pages de résultats publiques ; artifact `9976337671`. Location run `33990176467` ✅ : **16 IDs**. Union exacte retenue : **82**, aucun detail fetch, zeroDbWrites=true.

### Historical public-sitemap L0 — RECONCILED
PR `#223` : **6 270** lignes canonical-link-only, structurées : DarAgadir 5 567, LSF 379, Aykana 324. Shadow only, aucune activation publique.

### MASS-X5 — RECONCILED WITHOUT DOUBLE COUNT
Run `31762998799` ✅ / artifact `9205427369` : **51 169** candidates sur 16 domaines, **36 732** exact overlap, **14 437** exact net-new contre `source_offer_seeds`, 0 write/fetch source/WARC/permission inference.

Pour le scoreboard courant :
- Aykana : **+509 exact-net-new** distinct des 324 lignes sitemap déjà comptées ;
- Atlas + Masaken + SoukImmobilier : **2 163** candidates ;
- Mouldar : **1 081** ;
- Promo Immo Marrakech : **943** ;
- Kawtar Immobilier : **188** ;
- les autres domaines MASS-X5 ne sont pas additionnés sans reconciliation exacte avec leurs lanes déjà comptées.

### MASS-1 / HISTORICAL GAP — RECONCILED
Refresh MASS-1 `33993932592` : **317 605 discovery rows**, **169 252 URLs distinctes**, **30 637 détails Maroc probables**, zero write/source fetch.

Reconcile exact `34029546664` / artifact `9988296190` : **+1 613 exact-additive** hors lanes déjà comptées.

Historical Gap Hunt `34030138761` / artifact `9988514932` : 1immo apporte **+3 471** détails exact-net-new au-dessus de ses 201 seeds courantes. Les gros gaps Agenz/Masaken/Mouldar/Souk ne sont pas additionnés en bloc sans anti-overlap avec leurs lanes historiques.

### DATA-40K HISTORICAL 2025 — RECONCILED
Run `30126275406` ✅ : **80/80 requêtes Common Crawl**, **28 248 qualified seeds**, **26 777 newly inserted seed rows** au snapshot du 24 juillet 2026 ; artifact `8609457925`, artifact SHA256 `d34a220d7aae303f65e8c77bd2951977072bd9d1552087e08be78000ba7508ae`.

Ce lot n'est pas additionné globalement au compteur actuel, car ses domaines principaux chevauchent des lanes plus récentes et plus complètes. La réconciliation `source_offer_seeds` courante ajoute uniquement les domaines jusque-là absents du scoreboard : MarrakechRealty 1 944, Barnes 282, 1immo 201, Sakane 191, Milkiya 131, Expat 83, 1000-annonces 66, Housing.place 22 = **2 920**.

### DATA-1.2 B3 STRICT MOROCCO — RECONCILED
Snapshot read-only 2026-09-05 : **37 009** URLs en `policy_review_backlog`, **725** exact overlap avec `source_offer_seeds`, **36 284** hors seeds. Rejeu du classifier historique DATA-1.2 puis resserrage Morocco : `.ma` + signal immobilier/classified => **5 797 exact-net-new**, **114 domaines**. Principaux concentrateurs : `immo.mitula.ma` 1 675, `immobilier.trovit.ma` 1 653, `dabaannonce.ma` 794, `sakane.ma` 363, `souqcity.ma` 253. Aucun de ces chiffres n'accorde une policy ou une autorisation d'ingestion.

### DATA-4.9B — STRUCTURAL L0
Run `31370449455` ✅ : **10 127 net-new sitemap identities -> 2 326 structural-detail URL representations**, 7 801 rejects, 0 identity collision. Sources : ValFoncier 709, Christie's Morocco 602, Immo-Maroc 276, AgadirImmobilier.ma 37, ProImmobilier 99, Capital Properties 603. Ces sources restent `unverified + hidden + internal_signal_only`; structure != autorisation.

### COMMON CRAWL CURRENT RECONCILIATION — CLOSED +0
Run `33990451626` ✅ : **5 836 qualified seeds** sur 10 domaines / 3 indexes, exact overlap actuel **5 836**, exact net-new **0**, zeroDbWrites=true ; artifact `9976495165`.

### Domio — CLOSED PARTIAL / RETRY PARKED
Run `33984423190` ✅ : **2 020 listing-like**. Retry `33990882356` : 5/5 timeouts de 60 s sur `sitemap-properties.xml`, 0 ajout, zeroDbWrites=true. Lane directe parkée.

### Mitula / Trovit — DIRECT PROBE CLOSED +0
Run `33988656243` ✅ : robots/root accessibles, mais aucun réservoir sitemap/listing-detail exploitable certifié. Les volumes B3 historiques restent L0 uniquement ; aucune addition directe.

### MarocImmo — DIRECT CLOSED BY ROBOTS
Les probes directs ultérieurs ont fail-closed sur robots (`sitemap.xml` puis root). Aucun crawl direct additionnel ; les identités `MI-*` publiques restent seulement une piste indirecte.

### External reservoirs — POLICY ABSENT
Run `34038068489` ✅ : aucune ligne `source_policy_registry` pour Properstar, Green-Acres, Holprop, OpenSooq, JamesEdition, LuxuryEstate, FazWaz et variantes testées. **0 crawl direct ouvert** depuis ces domaines. Les volumes visibles sur moteurs/index publics ne sont pas comptés.

### ImmoDirect — PARKED
Run `33985219822` ✅ : **4 property URLs**. Rendement <300.

### MAnonce — RETRY/INDIRECT
Le full sweep `33985644309` a échoué sur `Network is unreachable` au chargement de robots. **0 candidate ajoutée** depuis ce run. Retenter seulement avec preuve robots fraîche ou surface indirecte publique.

## 5. JALONS

| Jalon | État |
|---|---|
| M10K | ✅ |
| M20K | ✅ |
| M25K | ✅ |
| M50K | ✅ |
| M100K | ✅ |
| **M150K** | ✅ CLOSED |
| **M200K** | ✅ **CLOSED — 253 372 représentations courantes / 200 000 (126,7 %)** |
| **M250K** | ✅ **CLOSED — 253 372 / 250 000 (101,35 %)** |

## 6. FILE D'EXÉCUTION — 12 LOTS

1. ✅ AlerteImmo full / Avito indirect.
2. ✅ Probe multi-sites.
3. ✅ Mubawab direct FULL — 18 445.
4. ✅ Akaar full sitemap — 76 843.
5. ✅ Domio first sitemap — 2 020 partial ; retry parké.
6. ✅ MarocAnnonces historical full source-first — 10 000 ; nouvelles reprises uniquement robots-safe.
7. ✅ ImmoDirect — 4, PARKED.
8. ✅ Yakeey exact L0 — 82.
9. ✅ MASS-1 + Historical Gap + Agenz historical reconciliations.
10. ✅ **Public GitHub dataset expansion Mubawab + Avito : +85 536 exact-net-new au-dessus des baselines déjà comptées.**
11. 🔵 Candidate Lake unifié : exact dedupe + provenance + layer + temporal cohort + clusters + freshness.
12. ⛔ Gate humain avant toute écriture prod/Vercel/policy registry.

## 7. RÈGLES DE RENDEMENT

- `>=1000 net-new` : full sweep prioritaire ;
- `300–999` : poursuivre en parallèle si coût faible ;
- `<300` : park sauf réservoir non atteint ;
- toujours publier `found -> overlap -> net-new -> union -> probable_unique -> live_confidence` ;
- erreurs/truncation séparées du statut CI ;
- un dataset historique exact peut augmenter L0 mais **jamais** `active`/`fresh` sans validation récente.

## 8. NEXT EXACT

1. ✅ **Freeze M250K** : total canonique figé à **253 372**, unions source et preuve de fermeture consignées ci-dessus.
2. 🔵 **Candidate Lake** : unifier provenance, source ID/URL, couche L0/L1, date/cohorte temporelle et fingerprints.
3. **Exact dedupe + clustering** : mesurer `253 372 representations -> probable_unique` sans suppression destructive.
4. **Freshness** : échantillonnage/validation récente uniquement sur lanes autorisées, puis publier `live_confidence` par source.
5. **Discovery incrémentale** : devient secondaire ; tout nouveau lot reste set-diff contre l'union certifiée, mais la priorité passe au clustering, à la provenance et à la freshness.
6. Les **1 938 non-Factory** restent en réserve jusqu'à filtre qualité excluant social/bruit.
7. Aucun onboarding de nouvelle source dans `source_policy_registry` sans gate humain séparé.

### Goal actif — Candidate Lake / Q1

- **Goal :** produire un manifest unifié et reproductible des **253 372 représentations** avec provenance, identité source, couche, cohorte temporelle et fingerprint de clustering.
- **Succès :** total d'entrée = 253 372 ; aucune perte silencieuse ; exact duplicates mesurés ; `probable_unique` calculé sans suppression destructive ; couverture provenance/layer/cohorte publiée.
- **Preuve :** run GitHub déterministe + artifact manifest/summary + invariants `databaseWrites=0`, `sourceSiteFetches=0`, `productionWrites=0`.

**Boussole actuelle : 253 372 représentations L0/L1 -> probable_unique -> live_confidence. M250K FROZEN.**