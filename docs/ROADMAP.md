# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-09-05**  
**Statut : MARKET COVERAGE — MASS DISCOVERY ACTIVE**

> **SOURCE UNIQUE DE VÉRITÉ GLOBALE.**
> Ce fichier est la seule boussole pour la stratégie, les priorités, les jalons, la couverture et l’ordre d’exécution AkarFinder.
> `docs/SESSION.md` est uniquement un handover court et doit renvoyer ici.
> Les autres specs canoniques restent locales à leur périmètre et ne définissent jamais le `Next exact` global.

---

## 1. NORTH STAR

Construire le **Property Graph le plus large possible du marché immobilier marocain** à partir de surfaces publiques récupérables et traçables.

### Objectifs

- **Stretch : >=250 000 candidates L0/L1 uniques** ;
- **Goal principal : >=200 000 candidates exploitables** ;
- mesurer séparément les **clusters probablement uniques** et les **annonces probablement actives** ;
- accepter le bruit en découverte, le classer ensuite ;
- ne jamais confondre `candidate`, `URL`, `ID source`, `représentation`, `annonce active` et `bien unique`.

---

## 2. DOCTRINE

`DISCOVER -> RAW EVIDENCE -> NORMALIZE -> EXACT DEDUPE -> CANDIDATE LAKE -> PROBABILISTIC CLUSTER -> FRESHNESS -> SEARCH ELIGIBILITY`

### Couches

| Couche | Définition | Bruit accepté |
|---|---|---|
| **L0 Discovery** | URL / ID / représentation candidate avec provenance | élevé |
| **L1 Observed** | candidate réellement observée sur une surface publique autorisée | moyen |
| **L2 Normalized** | ville/type/transaction/prix/surface/source normalisés | faible |
| **L3 Active** | preuve récente que l’annonce paraît encore active | minimal |

### Règle fondamentale

**Collecter large, conserver la preuve, dédupliquer tard.**

Aucune représentation source n’est détruite parce qu’elle ressemble à une autre. Les doublons probables sont regroupés via `property_cluster_id` avec `cluster_confidence`.

### KPI obligatoire par lane

`found -> overlap/already_seen -> net_new -> candidate_union -> probable_unique -> live_confidence`

---

## 3. NON-NÉGOCIABLES

- respecter `robots.txt` et les limites publiques ;
- aucun contournement login, CAPTCHA, paywall, anti-bot ou API privée ;
- provenance/evidence obligatoire ;
- bruit autorisé en L0/L1 mais jamais transformé en certitude ;
- `candidate != active` ; `URL != property unique` ;
- aucun `100 %` sans dénominateur mesurable ;
- déduplication non destructive ;
- une CI pending n’arrête pas les lanes indépendantes ;
- **aucun déploiement Vercel sans autorisation explicite** ;
- **aucune écriture Supabase / production sans gate humain explicite séparé**.

---

## 4. SCOREBOARD CERTIFIÉ

### Avito indirect

| Lane | Found | Overlap | Net-new | Union | Statut | Preuve |
|---|---:|---:|---:|---:|---|---|
| Kaynly | 5 807 | — | 5 807 | 5 807 | ✅ CLOSED | artifact `9965997820` |
| Common Crawl RE exact | 782 | 8 | 774 | 6 581 | ✅ CLOSED | artifact `9968819905` |
| Wayback 2025–2026 | 0 | 0 | 0 | 6 581 | ⏸ PARKED | rendement nul |
| AlerteImmo 8 shards | 4 813 | 418 | 4 395 | 10 976 | ✅ SUPERSEDED | artifact `9970941650` |
| **AlerteImmo full sitemap** | **14 540** | **5 777** | **8 763** | **19 739** | ✅ CLOSED | run `33971383335`, artifact `9971118875` |

**Baseline Avito indirecte : 19 739 IDs candidats certifiés.**

### Akaar public sitemap

Run `33984287820` ✅ SUCCESS ; artifact `9974670013` ; digest `sha256:286130c0acf8a338c5dd26167282bd6590e7203b3c3316ed23b1dc9da7122300`.

- sitemap racine : 7 sous-sitemaps ;
- 8 XML visités ;
- **78 168 URLs publiques sitemap** ;
- **76 843 URLs `/listing/...`** ;
- 1 248 `/shop/...` ;
- 27 809 unités incluses dans les sitemaps listings/units ;
- erreurs : **0** ;
- truncation : **false** ;
- robots sitemap : **allowed** ;
- Supabase actuel : **0 URL Akaar connue** ;
- donc **76 843 représentations listing Akaar sont exact-net-new au niveau URL source**.

### Union L0/L1 minimale actuellement mesurable

`19 739 Avito indirect + 76 843 Akaar listing URLs = 96 582 représentations candidates exactes`

Cette union est une **union de représentations source**, pas 96 582 biens uniques actifs.

---

## 5. MUBAWAB — RÉCONCILIATION ACTIVE

Vérité DB read-only observée avant certification CI finale :

- 14 778 lignes Mubawab ;
- 7 595 URLs canoniques uniques ;
- 7 183 doublons exacts ;
- 1 416 URLs uniques `accepted` ;
- 5 855 `unclassified` ;
- 799 `rejected` ;
- 2 540 vues dans les 30 derniers jours ;
- 178 dans les 7 derniers jours.

Le claim historique `>30k Mubawab` n’est **pas encore prouvé** par cette table.

CI reconciliation :
- v1 `33983856189` ❌ statement timeout ;
- v2 `33984082088` ❌ statement timeout ;
- v3 `33984246637` 🔵 full-table PK keyset + filtrage local, read-only.

Le chiffre Mubawab ne rejoint le scoreboard canonique qu’après artifact CI propre.

---

## 6. RÉCUPÉRABILITÉ MULTI-SITES

Probe `33971441131` ✅ ; artifact `9971074508`.

| Source | Racine publique autorisée | État |
|---|---|---|
| **Akaar** | ✅ | ✅ full sitemap certifié |
| **Domio** | ✅ | NEXT |
| **MarocAnnonces** | ✅ | NEXT pagination |
| **ImmoDirect** | ✅ | NEXT sitemap indexes |
| **MAnonce** | ✅ | probe routes |
| **Sarout** | ❌ racine | HOLD direct |
| **MarocImmo** | ❌ racine | HOLD direct |
| **Sekna** | ❌ racine | HOLD direct |

`root_allowed=false` n’est jamais remplacé par une supposition basée sur le volume marketing.

---

## 7. JALONS

| Jalon | Critère | État |
|---|---|---|
| **M10K** | >=10k candidates | ✅ |
| **M20K** | >=20k candidates | ✅ |
| **M25K** | >=25k candidates | ✅ |
| **M50K** | >=50k candidates | ✅ |
| **M100K** | >=100k candidates | 🟡 **96 582 — manque 3 418** |
| **M200K** | >=200k candidates exploitables | NORTH STAR |
| **M250K+** | >=250k L0/L1 candidates | STRETCH |

### Definition of Done M200K

1. `candidate_union >= 200 000` après exact-dedupe des identifiants ;
2. provenance/evidence pour 100 % des candidates ;
3. distribution par source/ville/layer/fraîcheur ;
4. représentations sources conservées ;
5. clustering probable non destructif ;
6. distribution L0/L1/L2/L3 publiée ;
7. limites robots et zones non récupérables documentées ;
8. aucun volume candidate présenté comme `active` ou `unique property` sans preuve dédiée.

---

## 8. RÈGLES DE RENDEMENT

- **>=1 000 net-new** : full sweep prioritaire ;
- **300–999** : poursuivre si coût faible, en parallèle ;
- **<300** : lane secondaire sauf réservoir non encore atteint ;
- erreurs et truncation toujours séparées ;
- `SUCCESS` CI ne signifie pas automatiquement Goal atteint.

---

## 9. FILE D’EXÉCUTION CANONIQUE — 12 LOTS

1. ✅ **AlerteImmo full sitemap** -> Avito union 19 739.
2. ✅ **Probe multi-sites**.
3. 🔵 **Mubawab inventory & reconciliation** -> CI v3 active.
4. ✅ **Akaar sitemap expansion** -> 76 843 listing URLs net-new exactes.
5. 🔵 **Domio sitemap expansion**.
6. 🔵 **MarocAnnonces pagination expansion**.
7. 🔵 **ImmoDirect sitemap expansion**.
8. 🟡 **MAnonce route probe**.
9. 🟡 **Agenz / Yakeey / autres surfaces autorisées**.
10. 🟡 **Common Crawl multi-collection + search indexes + archives**.
11. ⏳ **Candidate Lake unifié** -> exact dedupe + provenance + layer + freshness + clusters.
12. ⛔ **Gate humain prod** -> avant toute écriture Supabase/search prod ou Vercel.

---

## 10. NEXT EXACT

**Atteindre M100K immédiatement, puis M200K sans attendre une source parfaite.**

Ordre :
1. fermer Mubawab reconciliation v3 ;
2. lancer **Domio sitemap expansion** en parallèle ;
3. lancer **MarocAnnonces pagination expansion** ;
4. lancer **ImmoDirect sitemap expansion** ;
5. unionner chaque lane via `found / overlap / net-new / union` ;
6. conserver le bruit L0/L1 ;
7. dès M100K franchi, continuer sans pause vers M200K.

**Boussole : 96 582 candidates exactes mesurées -> 100k -> 200k exploitables -> 250k+ discovery.**
