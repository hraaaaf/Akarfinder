# AkarFinder — Roadmap canonique

**Version : 2026-07-23 — DATA / SEARCH DEPTH / QUALITY / FINAL PRODUCTION**

> Source de vérité opérationnelle actuelle. L'ancien `ROADMAP.md` historique reste disponible dans Git.

---

## 0. Vision canonique

AkarFinder = **moteur de recherche + index immobilier + couche d'intelligence**, avec `/search` comme cœur produit.

Objectif long terme : **Property Graph du marché immobilier marocain**.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

Invariants :

- no bypass / proxy / stealth / fake Googlebot / CAPTCHA solving / login bypass ;
- source registry obligatoire ;
- provenance traçable ;
- aucune donnée manquante inventée ;
- contenu partenaire/autorisé ≠ résultat public indexé ≠ signal marché interne ;
- un faux merge est plus grave que deux doublons ;
- aucune nouvelle feature produit avant maturité DATA/Search ;
- aucun déploiement Vercel intermédiaire sans décision explicite.

---

# 1. État global

### Architecture produit / technique

**~85–90 % construite**

### Readiness lancement ambitieux

**~65–70 %**

Le gap est principalement :

`masse structurée → conversion → fraîcheur → dédup multi-source → couverture → profondeur Search`

### Décision actuelle

**FREEZE nouvelles features produit.**

Le travail UX/UI détaillé continue séparément. Les findings retenus seront intégrés au Final Production Gate.

---

# 2. Snapshot DATA live — lecture seule 2026-07-23

| Population | Volume |
|---|---:|
| `source_offer_seeds` | **21 946** |
| `discovery_candidates` | **14 720** |
| `property_listings` | **869** |
| `listing_sources` | **874** |
| `property_clusters` | **730** |
| `property_cluster_members` | **730** |
| `source_offer_observations` | **0** |

### Seeds

- Sitemap public : **11 420**
- Common Crawl : **10 526**
- `seed_only` : **21 889**
- `fresh_confirmed` : **57**

### Discovery candidates

- accepted : **585**
- unclassified : **6 013**
- rejected : **8 122**

### Structured / Property Graph

- `property_listings` : **869**
- listings sans source : **0**
- listings multi-source : **4**
- clusters : **730**
- clusters multi-member : **0**

Le Property Graph matérialisé reste essentiellement :

`1 SourceOffer → 1 cluster`

### Finding critique

`source_offer_observations = 0`.

La table existe mais l'historique événementiel n'est pas encore alimenté.

---

# PHASE DATA — P0 🔴

## 3. Mass Acquisition Engine — largement construit

Déjà opérationnel :

- OpenSERP national ;
- sitemaps publics ;
- Common Crawl ;
- 53 villes/pôles ;
- FR + AR ;
- pagination profonde ;
- rotation / récupération faux rejets ;
- thin external seed index ;
- Seed Listing Mass Conversion V1 ;
- Seed Confirmation Query V2 ;
- acquisition Common Crawl canary-first/fail-soft.

Objectif long terme : **100k+ observations/seeds exploitables**, sans transformer 100k en vanity metric.

Pilotage obligatoire :

`VILLE × TRANSACTION × TYPE × SOURCE`

---

# 4. P0 immédiat — DATA CONVERSION FOUNDATION

## 4.1 `DATA-FUNNEL-TRUTH-AUDIT-1`

**Statut : pré-audit read-only avancé ; aucun code.**

Deux lanes doivent rester séparées :

### Lane A — Thin external index

`DISCOVERED → NORMALIZED → UNIQUE_SEED → THIN_INDEX_ELIGIBLE → SEARCHABLE_THIN`

Un seed peut être un lien externe thin sans devenir un `property_listing`.

### Lane B — Structured listing

`DISCOVERED → NORMALIZED → UNIQUE_SEED → CONFIRMABLE → ATTEMPTED → CONFIRMED → ADMISSIBLE → STRUCTURED → DISPLAY_ELIGIBLE → SEARCHABLE_STRUCTURED`

Ne jamais additionner naïvement `SEARCHABLE_THIN` et `STRUCTURED`.

### Findings confirmation déjà établis

- 229 seeds tentés ;
- 320 tentatives cumulées ;
- 17 `exact_high_confidence` ;
- 205 `no_exact_match` ;
- 7 `insufficient_explicit_signals` ;
- yield unique global : **~7,4 %** ;
- les 17 succès sont de vraies conversions : aucun `listing_source` n'existait avant leur tentative ;
- 57 `fresh_confirmed` = 17 liés à seed confirmation exacte + 40 issus d'autres recroisements freshness ;
- `fresh_confirmed` ≠ `structured listing`.

### Accepted ↔ persisted — vérité corrigée

Accepted URLs uniques : **559**.

Overlap canonique correct contre `listing_sources.listing_url` : **546**.

Accepted réellement non persistées : **13 seulement**.

La précédente estimation exploratoire de 307 était due à une mauvaise comparaison URL canonique ↔ URL originale et est invalidée.

Les 13 vraies non persistées :

- Mubawab : 5 ;
- Souk Immobilier : 4 ;
- 1immo : 2 ;
- Avito : 1 ;
- Sarouty : 1.

Petit `write-gap audit`, pas un réservoir massif.

---

## 4.2 Bulk Seed Confirmation V2 — ne pas reconstruire de zéro

Le moteur V1/V2 existe déjà.

Évolution cible : **yield-aware + bucket-aware**.

`SEED RESERVOIR → NORMALIZATION → SEED DEDUP → BUCKETS → PRIORITY QUEUE → BULK EVIDENCE → MATCH → CONFIDENCE → STRUCTURED CONVERSION`

Buckets :

`source × ville × transaction × type`

### Cas Masaken — meilleur signal actuel

- total seeds : **294** ;
- tentés : **16** ;
- exact high-confidence : **11** ;
- no exact match : **5** ;
- yield du petit batch : **68,8 %**.

Pourquoi cela fonctionne :

1. pattern individuel strict `/(fr|en)/immobilier-maroc/<slug>/<id>` ;
2. ID numérique stable ;
3. forte indexabilité moteur sur les 11 succès ;
4. exact canonical match ;
5. signaux métier explicites ;
6. admission existante inchangée.

Les 11 succès ont réellement produit des listings structurés.

**Ne pas extrapoler 68,8 % aux 278 seeds non testés.** Le sample est petit et sélectionné.

### Signal multi-source

- Masaken : 68,8 % sur 16 tentés ;
- Aykana : 13,3 % sur 15 ;
- Souk Immobilier : 8,3 % sur 12 ;
- L'Immobilier Sans Frontières : 5,0 % sur 40 ;
- Promo Immo Marrakech : 2,8 % sur 36 ;
- plusieurs sources : 0 % sur les petits batches testés.

Un ID stable ne suffit pas : la **discoverability exacte par le moteur de confirmation** est déterminante.

### Conséquence

- privilégier les lanes à yield prouvé ;
- conserver une exploration contrôlée ;
- ne jamais baisser les seuils ;
- aucune promotion sitemap-only ;
- aucune donnée métier inventée.

---

## 4.3 Unclassified Recovery Audit — taxonomie réelle

Réservoir : **6 013**.

Tous sont actuellement `low confidence`.

| Bucket | Volume | Action |
|---|---:|---|
| discovery/category pages | **2 225** | ne pas traiter comme fiches structurées |
| domain unclassified | **1 837** | qualification source séparée |
| quarantine | **1 252** | analyser les raisons de mismatch |
| blocked domains | **569** | ne pas promouvoir |
| other low confidence | **116** | audit secondaire |
| insufficient detail other | **14** | faible priorité |

### High-signal quarantine

Sur 1 252 quarantined :

- strong individual path : 144 ;
- explicit city : 1 169 ;
- strong path + city : 139 ;
- strong path + city + au moins un signal prix/surface/chambres : **99**.

Répartition des **99 high-signal** :

- Mubawab : 40 ;
- Barnes Marrakech : 29 ;
- Agenz : 12 ;
- Mouldar : 8 ;
- Avito : 3 ;
- 1immo : 2 ;
- Promo Immo Marrakech : 2 ;
- Souk Immobilier : 1 ;
- DarAgadir : 1 ;
- L'Immobilier Sans Frontières : 1.

### Finding structurel : cross-city mismatch

La logique actuelle implique qu'un résultat `strong_individual_path` avec type + transaction serait classé `individual_listing` si sa localisation explicite était cohérente avec la requête.

S'il reste en quarantine, le blocage est donc principalement :

`explicitLocationMatchesQuery = false`

Ces 99 ne justifient pas une baisse des seuils.

La bonne piste future à auditer est un éventuel :

**cross-city salvage / re-bucketing conservateur**

Une fiche fortement identifiée pourrait éventuellement être réaffectée à sa ville explicitement observée au lieu d'être perdue parce qu'un moteur l'a retournée sur une requête d'une autre ville.

Avant tout code :

- audit d'échantillon ;
- fiabilité extracteur ville/district ;
- hard blocks ;
- dédup ;
- aucune localisation inventée depuis la requête.

### Domain status historique obsolète

Parmi 1 837 `domain_unclassified`, seuls **52** correspondent à des domaines aujourd'hui approuvés dans le registry analysé :

- Masaken : 51 ;
- DarAgadir : 1.

Petit stock historique à reclassifier/auditer, pas un gisement massif.

---

## 4.4 Observation Ledger Foundation

`source_offer_observations` existe mais contient **0 ligne**.

Avant Freshness Machine #24, toute nouvelle observation future devra conceptuellement conserver :

- observed_at ;
- source_offer ;
- evidence/origin ;
- prix/surface observés si réellement disponibles ;
- source_status ;
- run/provenance.

Le design writer/idempotence doit être défini avant code.

---

## 4.5 Structured Conversion milestones

État live : **869**.

Objectifs :

`869 → 2 000 → 5 000 → 10 000+`

### GATE DATA-2

Minimum stratégique : **5 000 structured listings** avec diversité suffisante.

Cible forte : **10 000+**.

À chaque palier : Golden Query Set + Scorecard.

---

# PHASE PROPERTY GRAPH — #23

## 5. Property Graph V3 / Dedup

Objectif :

`Avito X + Mubawab X + Agenz X + autres représentations → 1 propriété canonique uniquement si preuves suffisantes`

États :

- `AUTO_MERGE`
- `POSSIBLE_MATCH`
- `DISTINCT`

Hard blocks :

- ville incompatible ;
- vente ≠ location ;
- type incompatible ;
- contradictions majeures prix/surface/chambres non expliquées ;
- jamais de merge texte-only.

Evidence trail obligatoire.

Objectif d'échelle indicatif :

`~100k observations → ~30–45k biens/offres uniques`

À mesurer empiriquement.

---

# PHASE FRESHNESS — #24

## 6. Freshness Machine

États cibles :

- fresh ;
- probably_fresh ;
- stale ;
- gone ;
- reappeared.

Sources de preuve : OpenSERP, sitemap, Common Crawl, partenaires/flux autorisés, Observation Ledger.

---

# PHASE STRUCTURATION — #25

## 7. Intelligence at Scale

- localisation normalisée ;
- quartier ;
- prix/m² ;
- typologie ;
- caractéristiques ;
- provenance ;
- AkarScore ;
- contexte marché ;
- qualité / complétude.

Aucune donnée manquante inventée.

---

# PHASE NEIGHBORHOODS — #26

## 8. Morocco Neighborhood Intelligence

`ville → quartier → micro-zone → mobilité → écoles → commerces → lifestyle → contexte prix`

Ne doit pas retarder DATA/Search P0.

---

# PHASE SEARCH DEPTH — #27

## 9. Search Depth Certification

Golden Query Set V1 : **60 requêtes**.

Scoring : relevance, depth, diversity, freshness, noise, duplicates, geographic coverage.

Checkpoints :

- 869 = baseline ;
- 2k = test ;
- 5k = certification intermédiaire ;
- 10k = certification forte ;
- 30k+ canonical = certification nationale.

### GATE SEARCH

**≥80 % des recherches communes satisfaisantes.**

---

# PHASE NATIONAL COVERAGE GAPS

## 10. Coverage Matrix

`VILLE × TRANSACTION × TYPE × SOURCE`

Combler les trous plutôt que maximiser le volume brut.

---

# PHASE PRODUCTION — #28

## 11. Final Production Gate

Seulement après maturité DATA/Search :

1. findings UX/UI retenus ;
2. Arabic/RTL core journey ;
3. account entry fix si encore nécessaire ;
4. responsive desktop/mobile ;
5. smoke tests ;
6. SEO/indexabilité ;
7. performance ;
8. final certification.

Puis : **ONE CONSOLIDATED VERCEL PRODUCTION DEPLOY**.

---

# 12. Ordre canonique actuel

```text
✅ MASS DISCOVERY / ACQUISITION FOUNDATION
        ↓
🔴 0. DATA FUNNEL TRUTH AUDIT — READ ONLY FIRST
        ↓
1. 13 ACCEPTED WRITE-GAP AUDIT
        ↓
2. 99 HIGH-SIGNAL CROSS-CITY AUDIT
        ↓
3. MASAKEN-LIKE PATTERN / INDEXABILITY ANALYSIS
        ↓
4. SEED HYGIENE / COVERAGE MATRIX
        ↓
5. BULK SEED CONFIRMATION V2 — YIELD-AWARE
        ↓
6. OBSERVATION LEDGER FOUNDATION
        ↓
7. STRUCTURED CONVERSION
   869 → 2k → 5k → 10k+
        ↓
8. PROPERTY GRAPH V3 / DEDUP
        ↓
9. FRESHNESS MACHINE
        ↓
10. INTELLIGENCE AT SCALE
        ↓
11. SEARCH DEPTH + GOLDEN QUERY CERTIFICATION
        ↓
12. NATIONAL COVERAGE GAP CLOSURE
        ↓
13. UX/UI FINDINGS RETAINED
        ↓
14. ARABIC / RTL / RESPONSIVE / SEO / PERFORMANCE / SMOKE
        ↓
15. FINAL CERTIFICATION
        ↓
🚀 ONE VERCEL PRODUCTION DEPLOY
```

---

# 13. Gates

## DATA-1 — Funnel Truth

- thin vs structured séparés ;
- compteurs réconciliés ;
- accepted canonical overlap correctement mesuré ;
- états persistés vs conceptuels identifiés ;
- top bottlenecks prouvés ;
- yield segmenté connu.

## DATA-2 — Masse

- ≥5 000 structured ;
- cible 10 000+ ;
- diversité suffisante.

## DATA-3 — Qualité

- provenance ;
- ville/type/transaction fiables ;
- aucune donnée inventée ;
- display eligibility explicite ;
- duplicate risk mesuré.

## DATA-4 — Search

- ≥80 % Golden Queries satisfaisantes.

## DATA-5 — Property Graph

- hard blocks ;
- possible_match séparé ;
- evidence trail ;
- audit humain avant auto-merge massif.

## PROD

- UX/UI retenu ;
- RTL ;
- responsive ;
- SEO ;
- performance ;
- smoke ;
- certification finale.

---

# 14. Jalon stratégique

> **AkarFinder atteint au minimum 5 000 annonces structurées + un thin index national profond + une recherche réellement satisfaisante sur les principales villes.**

Ensuite : Property Graph V3 → Freshness → Intelligence Scale → coverage finale → Production Gate.

---

# 15. Exécution immédiate autorisée avant GO code

Documentation / lecture seule uniquement :

- Data Funnel Spec ;
- Counter Map ;
- Funnel Truth live audit ;
- Golden Query Set ;
- Data Scorecard ;
- audits DB read-only ;
- préparation ODM précis.

### Code

**Aucune nouvelle mission code lancée.**

Prochaine séquence recommandée après GO :

`13 WRITE-GAP AUDIT → 99 CROSS-CITY AUDIT → MASAKEN-LIKE LANE ANALYSIS → BULK-SEED-CONFIRMATION-V2`
