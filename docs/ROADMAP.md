# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-09-05**  
**Statut : MARKET COVERAGE — M100K CLOSED / M200K ACTIVE**

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
| MarocAnnonces source-first residential union | **10 000** | ✅ CLOSED | run `33739495442`, artifact `9888335708`, digest `sha256:c23c571acae2863e1dd866126938174af67186da704e3ad30c8bb97fb3bf5bc9` |
| Sarouty property-detail sitemaps | **5 064** | ✅ CLOSED | run `33765427351`, artifact `9897323745`, digest `sha256:260ab772ed4f43c5eee41fbf0e04053e59716e76589ca0beb411dc619a8f5566` |
| Agenz source-first partial safe enumeration | **4 466** | ✅ PARTIAL | run `33764930794`, artifact `9898224274`, digest `sha256:34a34a4eb0f2ae8d8d0f185c17afbf105296f3439d5e3381abe2baa67e61b2fb` |
| DarAgadir + LSF + Aykana canonical-link public-sitemap rows | **6 270** | ✅ HISTORICAL L0 | PR `#223`, merge `686f71657c3d683360990d3125c19034086d83c2` |
| SoukImmobilier + Masaken + Atlas Common Crawl qualified seeds | **1 464** | ✅ HISTORICAL L0 | run `29806876923`, artifact `8485826615`; derived as `3027 total - 1563 DarAgadir overlap` |
| Domio listing-like URLs | **2 020** | ✅ PARTIAL | run `33984423190`, artifact `9974714576` |
| ImmoDirect `/property/...` | **4** | ✅ PARKED faible rendement | run `33985219822`, artifact `9974939355` |

### Union L0/L1 minimale mesurée

**144 315 représentations candidates exactes par identité source/ID ou source/URL.**

Calcul : `136 581 + 6 270 + 1 464 = 144 315`.

Les 6 270 et 1 464 lignes historiques sont comptées **L0 uniquement** avec provenance ; elles ne sont pas déclarées actives/fraîches en 2026-09 sans nouvelle observation.

Ce n'est **pas** 144 315 biens uniques actifs. Les sources différentes peuvent représenter le même bien ; le recouvrement sera traité au clustering.

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
PR `#223` : **6 270** lignes canonical-link-only, structurées, issues de sitemaps publics : DarAgadir 5 567, LSF 379, Aykana 324. Shadow only, aucune activation publique. La fraîcheur de l'époque ne vaut pas fraîcheur actuelle ; conservation L0 seulement.

### Historical Common Crawl class-A — RECONCILED
Run `29806876923` : **3 027 qualified seeds** dédupliqués sur SoukImmobilier, DarAgadir, Masaken, Atlas ; DarAgadir = **1 563** et chevauche le réservoir DarAgadir déjà compté, donc seuls les **1 464** des trois autres domaines sont ajoutés au scoreboard. Metadata-only, zero DB write.

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
| **M200K** | 🔵 ACTIVE — **144 315 / 200 000**, manque **55 685** |
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

1. Continuer la **réconciliation historique** pour retrouver tout FULL/artifact certifié non encore compté, avec déduplication par domaine/source avant ajout.
2. Chercher en priorité les anciens réservoirs `source_offer_seeds` / Common Crawl / source discovery dont le volume est >1 000 et dont l'identité n'est pas déjà dans le scoreboard.
3. **Agenz** : mesurer la queue restante sans bypass via surfaces indirectes publiques.
4. **Yakeey** : identifier la couche publique qui transporte les IDs/URLs des 2 377 résultats affichés ; ne rien compter avant preuve.
5. Reprendre **MAnonce** et **Domio** seulement si la voie est fiable et rentable.
6. Continuer jusqu'à **M200K**, puis unifier le Candidate Lake et mesurer le recouvrement inter-source.

**Boussole actuelle : 144 315 -> 200 000 -> 250 000+.**
