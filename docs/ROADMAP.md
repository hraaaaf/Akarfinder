# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-09-05**  
**Statut : MARKET COVERAGE — M150K CLOSED / M200K ACTIVE**

> **SOURCE UNIQUE DE VÉRITÉ GLOBALE.** Ce fichier est la seule boussole globale AkarFinder. `docs/SESSION.md` n'est qu'un handover. Les autres specs restent locales à leur périmètre.

## 1. NORTH STAR

Construire le Property Graph le plus large possible du marché immobilier marocain à partir de surfaces publiques récupérables et traçables.

- **Goal principal : >=200 000 candidates exploitables**.
- **Stretch : >=250 000 candidates L0/L1 uniques**.
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
| ImmoDirect `/property/...` | **4** | ✅ PARKED faible rendement | run `33985219822`, artifact `9974939355` |

### Union L0/L1 minimale mesurée

**152 981 représentations candidates exactes par identité source/ID ou source/URL.**

Calcul : `149 552 + 509 + 2 920 = 152 981`.

MASS-X5 finale (`31762998799`) certifie globalement `candidate_unique=51 169`, `exact_overlap=36 732`, `exact_net_new=14 437`. **Les 14 437 ne sont pas additionnés en bloc** car plusieurs domaines chevauchent déjà le scoreboard. Seuls les volumes dont l'absence ou le net-new est prouvé sont retenus.

DATA-40K Historical 2025, run `30126275406`, a récolté **28 248 seeds qualifiées** sur 10 domaines / 8 indexes Common Crawl et en a inséré **26 777 net-new à l'époque**. Ce total historique **n'est pas ajouté en bloc aujourd'hui** : les domaines Avito, Mubawab, Agenz, Sarouty, DarAgadir, Mouldar, Masaken, SoukImmobilier et Atlas sont déjà représentés dans le scoreboard courant. Seuls les domaines actuellement absents du scoreboard et présents dans `source_offer_seeds` sont ajoutés séparément, soit **2 920** URL identities.

Les lignes historiques/structurelles sont comptées **L0 uniquement** avec provenance ; elles ne sont pas déclarées actives, fraîches ou autorisées à l'affichage.

Ce n'est **pas** 152 981 biens uniques actifs. Les sources différentes peuvent représenter le même bien ; le recouvrement sera traité au clustering.

## 4. DÉTAILS / DÉCISIONS DE LANE

### Mubawab — FULL CLOSED
Run `33964834762` ✅ : **3 174/3 174 shards**, **18 445 IDs uniques**, queue=0, zeroDbWrites=true.

### MarocAnnonces — FULL SOURCE-FIRST CLOSED
Run `33739495442` ✅ : **546 pages**, **547 requêtes**, **10 000 IDs uniques**, queueRemaining=0, aucun cap atteint, zeroDbWrites=true. Toute nouvelle reprise doit rester fail-closed selon robots courant.

### Sarouty — FULL PROPERTY SITEMAPS CLOSED
Run `33765427351` ✅ : 6/6 property-detail sitemaps déclarés, **5 064 IDs uniques**, 8 requêtes total, aucun cap, zeroDbWrites=true.

### Agenz — PARTIAL CERTIFIED
Run `33764930794` : **4 466 IDs uniques** observés sur 430 pages avant `hard_block`, queueRemaining=1 397. Arrêt de sécurité correct, aucun retry/bypass, zeroDbWrites=true. Ne pas présenter comme inventaire complet.

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

### DATA-40K HISTORICAL 2025 — RECONCILED
Run `30126275406` ✅ : **80/80 requêtes Common Crawl**, **28 248 qualified seeds**, **26 777 newly inserted seed rows** au snapshot du 24 juillet 2026 ; artifact `8609457925`, artifact SHA256 `d34a220d7aae303f65e8c77bd2951977072bd9d1552087e08be78000ba7508ae`.

Ce lot n'est pas additionné globalement au compteur actuel, car ses domaines principaux chevauchent des lanes plus récentes et plus complètes. La réconciliation `source_offer_seeds` courante ajoute uniquement les domaines jusque-là absents du scoreboard : MarrakechRealty 1 944, Barnes 282, 1immo 201, Sakane 191, Milkiya 131, Expat 83, 1000-annonces 66, Housing.place 22 = **2 920**.

### DATA-4.9B — STRUCTURAL L0
Run `31370449455` ✅ : **10 127 net-new sitemap identities -> 2 326 structural-detail URL representations**, 7 801 rejects, 0 identity collision. Sources : ValFoncier 709, Christie's Morocco 602, Immo-Maroc 276, AgadirImmobilier.ma 37, ProImmobilier 99, Capital Properties 603. Ces sources restent `unverified + hidden + internal_signal_only`; structure != autorisation.

### Domio — CLOSED PARTIAL
Run `33984423190` ✅ : **2 020 listing-like** ; `sitemap-properties.xml` a timeout, reprise résiliente plus tard.

### ImmoDirect — PARKED
Run `33985219822` ✅ : **4 property URLs**. Rendement <300.

### Yakeey — PROBE ONLY
Run `33985996717` ✅ : routes robots-allowed, **2 377 biens affichés** sur l'achat Maroc, pagination jusqu'à 96, mais 0 lien détail extrait du HTML SSR. **0 candidate ajoutée** tant qu'un identifiant/URL de fiche n'est pas prouvé.

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
| **M150K** | ✅ CLOSED — **152 981** |
| **M200K** | 🔵 ACTIVE — manque **47 019** |
| M250K+ | STRETCH |

## 6. FILE D'EXÉCUTION — 12 LOTS

1. ✅ AlerteImmo full / Avito indirect.
2. ✅ Probe multi-sites.
3. ✅ Mubawab FULL — 18 445.
4. ✅ Akaar full sitemap — 76 843.
5. ✅ Domio first sitemap — 2 020 partial.
6. ✅ MarocAnnonces historical full source-first — 10 000 ; nouvelles reprises uniquement robots-safe.
7. ✅ ImmoDirect — 4, PARKED.
8. 🟡 MAnonce retry/indirect.
9. 🔵 **Agenz continuation + Yakeey detail-surface discovery + Sarouty refresh only if net-new evidence**.
10. 🔵 **Common Crawl multi-source / archives / long-tail source discovery**.
11. ⏳ Candidate Lake unifié : exact dedupe + provenance + layer + freshness + clusters.
12. ⛔ Gate humain avant toute écriture prod/Vercel.

## 7. RÈGLES DE RENDEMENT

- `>=1000 net-new` : full sweep prioritaire ;
- `300–999` : poursuivre en parallèle si coût faible ;
- `<300` : park sauf réservoir non atteint ;
- toujours publier `found -> overlap -> net-new -> union -> probable_unique -> live_confidence` ;
- erreurs/truncation séparées du statut CI.

## 8. NEXT EXACT

1. **M150K fermé** à **152 981** ; ne plus travailler pour le seuil, uniquement pour M200K.
2. Chercher un prochain réservoir **>10 000 net-new exact** ; priorité aux domaines absents du scoreboard et aux surfaces publiques/archives déjà qualifiées.
3. Réconcilier les anciens lots DATA-40K / MASS par URL exacte avant tout ajout sur un domaine déjà présent.
4. **Agenz** : mesurer la queue restante sans bypass via surfaces indirectes publiques.
5. **Yakeey** : identifier la couche publique qui transporte les IDs/URLs des 2 377 résultats affichés ; ne rien compter avant preuve.
6. Reprendre **MAnonce** et **Domio** seulement si la voie est fiable et rentable.
7. À M200K : unifier Candidate Lake, exact dedupe, provenance, layer, freshness, clusters et mesure de recouvrement inter-source.

**Boussole actuelle : 152 981 -> 200 000 -> 250 000+.**
