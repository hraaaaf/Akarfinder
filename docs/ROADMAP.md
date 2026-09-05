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
| Akaar `/listing/...` | **76 843** | ✅ | run `33984287820`, artifact `9974670013`, digest `sha256:286130c0acf8a338c5dd26167282bd6590e7203b3c3316ed23b1dc9da7122300` |
| Mubawab canonical URLs | **7 595** | ✅ | run `33984246637`, artifact `9974774486`, digest `sha256:dcc3d358991a006c3a0f1a8e35db3dd49b343a5b82f0e21e3905cd38ade3ebf4` |
| Domio listing-like URLs | **2 020** | ✅ partial | run `33984423190`, artifact `9974714576`, digest `sha256:95f81667afd69c4d86e1a5130d4bcbf8daddff50e4acc18995ae2c044a404d1d` |

### Union L0/L1 minimale mesurée

**106 197 représentations candidates exactes par identité URL/source.**

Calcul : `19 739 + 76 843 + 7 595 + 2 020 = 106 197`.

Ce n'est **pas** 106 197 biens uniques actifs. Les sources différentes peuvent représenter le même bien ; ce recouvrement sera traité au clustering, pas détruit à la collecte.

## 4. DÉTAILS UTILES

### Mubawab — réconciliation CLOSED

Run `33984246637` ✅ :
- 317 084 lignes DB scannées read-only ;
- 14 778 lignes Mubawab ;
- **7 595 URLs canoniques uniques** ;
- 7 183 doublons exacts ;
- 5 686 `unclassified`, 1 301 `accepted`, 608 `rejected` ;
- 2 540 vues 30j ; 178 vues 7j ;
- 3 661 shard-like ;
- le claim historique `>30k Mubawab` n'est **pas prouvé** par le corpus actuel.

### Domio — premier sweep CLOSED PARTIAL

Run `33984423190` ✅ :
- 17 439 URLs sitemap publiques observées ;
- 17 623 union avec liens HTML ;
- **2 020 listing-like retenues** ;
- `sitemap-properties.xml` a timeout : lane non exhaustive et à reprendre plus tard ;
- autres milliers d'URLs sont catégories/quartiers/multilingues et ne sont pas comptées comme listings.

## 5. JALONS

| Jalon | État |
|---|---|
| M10K | ✅ |
| M20K | ✅ |
| M25K | ✅ |
| M50K | ✅ |
| **M100K** | ✅ **106 197** |
| **M200K** | 🔵 ACTIVE — manque **93 803** |
| M250K+ | STRETCH |

## 6. FILE D'EXÉCUTION — 12 LOTS

1. ✅ AlerteImmo full / Avito indirect.
2. ✅ Probe multi-sites.
3. ✅ Mubawab reconciliation — 7 595 uniques.
4. ✅ Akaar full sitemap — 76 843 listing URLs.
5. ✅ Domio first sitemap — 2 020 listing-like ; reprise properties à prévoir.
6. 🔵 **MarocAnnonces mass pagination sweep** — next exact.
7. 🔵 **ImmoDirect sitemap expansion**.
8. 🟡 MAnonce route expansion.
9. 🟡 Agenz / Yakeey / autres surfaces autorisées.
10. 🟡 Common Crawl multi-collection + search indexes + archives.
11. ⏳ Candidate Lake unifié : exact dedupe + provenance + layer + freshness + clusters.
12. ⛔ Gate humain avant toute écriture prod/Vercel.

## 7. RÈGLES DE RENDEMENT

- `>=1000 net-new` : full sweep prioritaire ;
- `300–999` : poursuivre en parallèle si coût faible ;
- `<300` : park sauf réservoir non atteint ;
- toujours publier `found -> overlap -> net-new -> union -> probable_unique -> live_confidence` ;
- erreurs/truncation séparées du statut CI.

## 8. NEXT EXACT

1. **MarocAnnonces mass pagination sweep** : extraire les IDs publics `/annonce/{id}/...` sur la pagination immobilier vente, checkpointé et sharded.
2. En parallèle **ImmoDirect sitemap expansion**.
3. Reprendre `Domio sitemap-properties.xml` avec stratégie résiliente.
4. Continuer jusqu'à **M200K**, sans pause au M100K.
5. Unifier ensuite le Candidate Lake et mesurer le recouvrement inter-source.

**Boussole actuelle : 106 197 -> 200 000 -> 250 000+.**
