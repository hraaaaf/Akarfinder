# AkarFinder — Roadmap canonique

**Version : 2026-07-23 — DATA / SEARCH DEPTH / QUALITY / FINAL PRODUCTION**

> Source de vérité opérationnelle actuelle. L'ancien `ROADMAP.md` était devenu un journal historique de plus de 5 000 lignes ; son historique reste disponible dans Git.

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
- aucun nouveau feature chantier avant maturité DATA/Search ;
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

Le travail UX/UI détaillé continue séparément. Les findings retenus seront intégrés au Final Production Gate, pas avant.

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

Le Property Graph matérialisé reste donc essentiellement :

`1 SourceOffer → 1 cluster`

### Finding critique

`source_offer_observations = 0`.

La table existe mais l'historique événementiel n'est pas encore alimenté. La future Freshness Machine doit être préparée dès la phase de conversion/observation, sans inventer ni réécrire l'historique.

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

Objectif long terme : **100k+ observations/seeds exploitables**, mais 100k n'est pas une vanity metric.

Pilotage obligatoire :

`VILLE × TRANSACTION × TYPE × SOURCE`

---

# 4. P0 immédiat — DATA CONVERSION FOUNDATION

## 4.1 `DATA-FUNNEL-TRUTH-AUDIT-1`

**Statut : préparation read-only commencée ; aucun code.**

Il faut réconcilier exactement deux lanes distinctes :

### Lane A — Thin external index

`DISCOVERED → NORMALIZED → UNIQUE_SEED → THIN_INDEX_ELIGIBLE → SEARCHABLE_THIN`

Un seed peut être un lien externe thin sans devenir un `property_listing`.

### Lane B — Structured listing

`DISCOVERED → NORMALIZED → UNIQUE_SEED → CONFIRMABLE → ATTEMPTED → CONFIRMED → ADMISSIBLE → STRUCTURED → DISPLAY_ELIGIBLE → SEARCHABLE_STRUCTURED`

Ne jamais additionner naïvement `SEARCHABLE_THIN` et `STRUCTURED` comme une seule population.

### Findings pré-audit déjà établis

- 229 seeds ont été tentés en confirmation ;
- 320 tentatives cumulées ;
- 17 `exact_high_confidence` ;
- 205 `no_exact_match` ;
- 7 `insufficient_explicit_signals` ;
- yield unique global actuel : **~7,4 %** ;
- 57 `fresh_confirmed` = 17 issus de seed confirmation exacte + 40 issus d'un autre recroisement freshness ;
- donc `fresh_confirmed` ≠ `structured listing`.

### Pool à auditer

559 URLs `accepted` uniques ont été observées ; seulement 252 ont un overlap URL exact avec les sources persistées.

**~307 accepted unique URLs sans overlap exact `listing_sources`** doivent être auditées avant toute nouvelle acquisition massive.

Ce n'est pas un droit de promotion automatique.

---

## 4.2 Bulk Seed Confirmation V2 — ne pas reconstruire de zéro

Le moteur V1/V2 existe déjà.

La prochaine évolution doit être **yield-aware + bucket-aware** :

`SEED RESERVOIR → NORMALIZATION → SEED DEDUP → BUCKETS → PRIORITY QUEUE → BULK EVIDENCE → MATCH → CONFIDENCE → STRUCTURED CONVERSION`

Buckets :

`source × ville × transaction × type`

### Signal live majeur

`masaken.ma` :

- 16 seeds tentés ;
- 11 exact high-confidence ;
- yield ≈ **68,8 %**.

C'est le meilleur signal observé et il faut comprendre pourquoi avant de scaler.

Autres exact high-confidence observés :

- limmobiliersansfrontieres.com : 2 ;
- aykana.ma : 2 ;
- promoimmomarrakech.com : 1 ;
- soukimmobilier.com : 1.

Plusieurs sources testées restent à 0 exact high-confidence.

### Conséquence

Ne pas répartir uniformément la capacité de confirmation.

Utiliser :

- exploitation des sources à yield prouvé ;
- exploration contrôlée des autres sources ;
- aucune baisse des garde-fous ;
- aucune promotion sitemap-only ;
- aucune donnée métier inventée.

---

## 4.3 Unclassified Recovery Audit

Réservoir actuel : **6 013 `discovery_candidates` unclassified**.

Top volumes observés : Sarouty, Mubawab, Avito, Agenz, Mouldar, Barnes Marrakech, Marrakech Realty, 1immo, etc.

Approche :

1. échantillonnage ;
2. taxonomy des causes ;
3. recoverable rate ;
4. correction ciblée seulement si gain prouvé.

Pas de `promote all`.

---

## 4.4 Observation Ledger Foundation

La table `source_offer_observations` existe mais contient **0 ligne**.

Avant Freshness Machine #24, chaque nouvelle observation future devra conceptuellement conserver :

- `observed_at` ;
- source_offer ;
- evidence/origin ;
- prix/surface observés si réellement disponibles ;
- source_status ;
- run/provenance.

Le design writer/idempotence doit être préparé avant code.

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

À mesurer empiriquement, jamais à promettre.

---

# PHASE FRESHNESS — #24

## 6. Freshness Machine

États cibles :

- fresh ;
- probably_fresh ;
- stale ;
- gone ;
- reappeared.

Sources de preuve :

- OpenSERP ;
- sitemap ;
- Common Crawl ;
- partenaires/flux autorisés ;
- Observation Ledger.

But : ne jamais transformer la profondeur en cimetière d'annonces mortes.

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

Déjà construit en grande partie :

- profondeur backend élargie ;
- pagination / afficher plus ;
- thin index ;
- Gateway combiné.

### Golden Query Set

60 requêtes V1 déjà préparées dans `docs/GOLDEN_QUERY_SET.md`.

Scoring :

- relevance ;
- depth ;
- diversity ;
- freshness ;
- noise ;
- duplicates ;
- geographic coverage.

Checkpoints :

- 869 = baseline ;
- 2k = test ;
- 5k = certification intermédiaire ;
- 10k = certification forte ;
- 30k+ canonical = certification nationale.

### GATE SEARCH

**≥80 % des recherches communes satisfaisantes.**

La croissance DATA n'est validée que si `/search` s'améliore réellement.

---

# PHASE NATIONAL COVERAGE GAPS

## 10. Coverage Matrix

Piloter avec :

`VILLE × TRANSACTION × TYPE × SOURCE`

Combler les trous au lieu de maximiser le volume brut.

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

Puis :

**ONE CONSOLIDATED VERCEL PRODUCTION DEPLOY**

---

# 12. Ordre exact canonique

```text
✅ MASS DISCOVERY / ACQUISITION FOUNDATION
        ↓
🔴 0. DATA FUNNEL TRUTH AUDIT — READ ONLY FIRST
        ↓
1. ACCEPTED-BUT-UNPERSISTED AUDIT
   + UNCLASSIFIED RECOVERY AUDIT
        ↓
2. SEED HYGIENE / URL DEDUP / COVERAGE MATRIX
        ↓
3. BULK SEED CONFIRMATION V2 — YIELD-AWARE
        ↓
4. OBSERVATION LEDGER FOUNDATION
        ↓
5. STRUCTURED CONVERSION
   869 → 2k → 5k → 10k+
        ↓
6. PROPERTY GRAPH V3 / DEDUP
        ↓
7. FRESHNESS MACHINE
        ↓
8. INTELLIGENCE AT SCALE
        ↓
9. SEARCH DEPTH + GOLDEN QUERY CERTIFICATION
        ↓
10. NATIONAL COVERAGE GAP CLOSURE
        ↓
11. UX/UI FINDINGS RETAINED
        ↓
12. ARABIC / RTL / RESPONSIVE / SEO / PERFORMANCE / SMOKE
        ↓
13. FINAL CERTIFICATION
        ↓
🚀 ONE VERCEL PRODUCTION DEPLOY
```

Golden Query Set et Coverage Matrix commencent maintenant et restent transversaux.

---

# 13. Gates

## DATA-1 — Funnel Truth

- compteurs réconciliés ;
- thin vs structured séparés ;
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

Ensuite seulement : Property Graph V3 → Freshness → Intelligence Scale → coverage finale → Production Gate.

---

# 15. Exécution immédiate autorisée avant GO code

Documentation / lecture seule uniquement :

- `DATA_FUNNEL_SPEC.md` ;
- `DATA_COUNTER_MAP_PREAUDIT.md` ;
- `DATA_FUNNEL_TRUTH_PREAUDIT_LIVE_2026-07-23.md` ;
- `GOLDEN_QUERY_SET.md` ;
- `DATA_SCORECARD_SPEC.md` ;
- analyses DB read-only ;
- préparation ODM précis.

### Code

**Aucune nouvelle mission code lancée.**

Prochaine mission recommandée après GO :

`DATA-FUNNEL-TRUTH-AUDIT-1`

D'abord read-only/instrumentation minimale si nécessaire, puis seulement `BULK-SEED-CONFIRMATION-V2` sur bottlenecks prouvés.
