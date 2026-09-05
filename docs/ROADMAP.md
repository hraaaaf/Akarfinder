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
| Akaar `/listing/...` | **76 843** | ✅ | run `33984287820`, artifact `9974670013` |
| Mubawab canonical URLs | **7 595** | ✅ | run `33984246637`, artifact `9974774486` |
| Domio listing-like URLs | **2 020** | ✅ partial | run `33984423190`, artifact `9974714576` |
| ImmoDirect `/property/...` | **4** | ✅ PARKED faible rendement | run `33985219822`, artifact `9974939355`, digest `sha256:1fcac464815bd6752c7de4efb28c5799bae863a3fe7c6f4e81e083c1c5050e1f` |

### Union L0/L1 minimale mesurée

**106 201 représentations candidates exactes par identité URL/source.**

Calcul : `19 739 + 76 843 + 7 595 + 2 020 + 4 = 106 201`.

Ce n'est **pas** 106 201 biens uniques actifs. Les sources différentes peuvent représenter le même bien ; le recouvrement sera traité au clustering.

## 4. DÉTAILS / DÉCISIONS DE LANE

### Mubawab — CLOSED

Run `33984246637` ✅ : 14 778 lignes, **7 595 URLs uniques**, 7 183 doublons exacts. Le claim historique `>30k` n'est pas prouvé par le corpus actuel.

### Domio — CLOSED PARTIAL

Run `33984423190` ✅ : 17 439 URLs sitemap, **2 020 listing-like**. `sitemap-properties.xml` a timeout ; reprise résiliente plus tard.

### ImmoDirect — PARKED faible rendement

Run `33985219822` ✅ : 7 XML, 74 URLs sitemap, **4 property URLs**, 0 erreur. Rendement <300 : park selon règle canonique.

### MarocAnnonces direct pagination — PARKED / robots

Run `33985150107` : la pagination numérique construite (`/categorie/16/Immobilier-vente/{page}.html`) est `robots_disallowed`. **0 candidate comptée** depuis cette lane directe. Aucun contournement n'est autorisé.

Pivot actif : **Common Crawl URL Index** ciblé sur les URLs publiques historiques `/annonce/{id}/...`, avec **0 requête directe MarocAnnonces**. Run `33985242057`.

## 5. JALONS

| Jalon | État |
|---|---|
| M10K | ✅ |
| M20K | ✅ |
| M25K | ✅ |
| M50K | ✅ |
| **M100K** | ✅ **106 201** |
| **M200K** | 🔵 ACTIVE — manque **93 799** |
| M250K+ | STRETCH |

## 6. FILE D'EXÉCUTION — 12 LOTS

1. ✅ AlerteImmo full / Avito indirect.
2. ✅ Probe multi-sites.
3. ✅ Mubawab reconciliation — 7 595 uniques.
4. ✅ Akaar full sitemap — 76 843 listing URLs.
5. ✅ Domio first sitemap — 2 020 listing-like ; reprise properties à prévoir.
6. 🔵 **MarocAnnonces indirect — Common Crawl radar** ; direct pagination PARKED robots.
7. ✅ **ImmoDirect sitemap** — 4, PARKED faible rendement.
8. 🔵 **MAnonce route expansion**.
9. 🟡 Agenz / Yakeey / autres surfaces autorisées.
10. 🔵 Common Crawl multi-collection + search indexes + archives.
11. ⏳ Candidate Lake unifié : exact dedupe + provenance + layer + freshness + clusters.
12. ⛔ Gate humain avant toute écriture prod/Vercel.

## 7. RÈGLES DE RENDEMENT

- `>=1000 net-new` : full sweep prioritaire ;
- `300–999` : poursuivre en parallèle si coût faible ;
- `<300` : park sauf réservoir non atteint ;
- toujours publier `found -> overlap -> net-new -> union -> probable_unique -> live_confidence` ;
- erreurs/truncation séparées du statut CI.

## 8. NEXT EXACT

1. Fermer **MarocAnnonces Common Crawl radar** et ajouter uniquement les IDs prouvés.
2. Ouvrir **MAnonce** puis **Agenz/Yakeey** selon rendement public.
3. Lancer une passe **Common Crawl multi-collection** sur les sources déjà connues pour rattraper le bruit/historique.
4. Reprendre Domio properties avec stratégie résiliente en parallèle seulement si rentable.
5. Continuer jusqu'à **M200K**, sans pause intermédiaire.

**Boussole actuelle : 106 201 -> 200 000 -> 250 000+.**
