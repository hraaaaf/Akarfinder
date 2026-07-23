# AkarFinder — Roadmap canonique

**Version canonique : 2026-07-23 — DATA / SEARCH DEPTH / QUALITY / FINAL PRODUCTION**

> Ce document remplace les anciennes priorités opérationnelles de `ROADMAP.md`.
> L'historique détaillé des anciennes missions reste disponible dans l'historique Git.
> Toute nouvelle mission doit respecter l'ordre, les gates et les invariants ci-dessous.

---

## 0. Vision produit canonique

AkarFinder est un **moteur de recherche + index immobilier + couche d'intelligence** centré sur `/search`.

Objectif long terme : construire le **Property Graph du marché immobilier marocain**.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

Doctrine absolue :

- no bypass ;
- no proxy / stealth ;
- no fake Googlebot ;
- no CAPTCHA solving ;
- no login bypass ;
- source registry obligatoire ;
- provenance traçable ;
- respect des politiques source ;
- distinction stricte entre contenu partenaire/autorisé, résultat public indexé et signal marché interne ;
- aucune donnée manquante inventée ;
- un faux merge est plus grave que deux doublons ;
- aucun déploiement Vercel intermédiaire pendant la phase DATA sauf décision explicite séparée.

---

## 1. État global — 2026-07-23

### Architecture produit / technique construite

**~85–90 %**

L'architecture produit est largement construite. Le chantier critique n'est plus l'ajout de features mais :

`DATA → profondeur de recherche → qualité → certification → déploiement final`

### Readiness réelle pour lancement ambitieux

**~65–70 %**

Le différentiel vient principalement de :

- la masse de données structurées ;
- la conversion seed → listing ;
- la qualité / fraîcheur ;
- le vrai dédoublonnage multi-source ;
- la couverture nationale équilibrée ;
- la profondeur réelle de `/search`.

### Freeze produit

**Aucune nouvelle feature produit prioritaire pour le moment.**

Le travail UX/UI en cours est audité séparément. Les corrections retenues seront intégrées plus tard dans le Final Production Gate, sans détourner le chantier DATA actuel.

---

# PHASE DATA — P0 ACTUEL 🔴

## 2. Mass Acquisition Engine — ~70 %

### Déjà opérationnel

- OpenSERP national ;
- sitemaps publics ;
- Common Crawl ;
- 53 villes / pôles ;
- FR + AR ;
- pagination profonde ;
- rotation automatique ;
- récupération des faux rejets ;
- thin index public sur le réservoir de seeds ;
- `SEED-LISTING-MASS-CONVERSION-V1` déjà fusionné ;
- `SEED-CONFIRMATION-QUERY-V2` déjà fusionné.

### Snapshot DATA actuel

**21 946 URLs candidates**

- Sitemap : **11 420** ;
- Common Crawl : **10 526**.

Autres repères actuels :

- `fresh_confirmed` : **44** ;
- `property_listings` structurées : **840** ;
- clusters : **701**, encore principalement 1 SourceOffer = 1 cluster.

> Ces compteurs ne doivent pas être comparés naïvement avant le Funnel Truth Audit : ils peuvent provenir de populations / étapes différentes.

### Objectif acquisition

Atteindre **100k+ observations / seeds exploitables** sans sacrifier :

- légalité ;
- provenance ;
- fraîcheur ;
- qualité ;
- déduplication ;
- couverture nationale équilibrée.

**100k n'est pas une vanity metric.** La qualité de couverture `ville × transaction × type × source` est prioritaire sur le volume brut.

---

## 3. P0 immédiat — DATA CONVERSION FOUNDATION

La prochaine mission ne consiste pas à reconstruire le Bulk Engine de zéro.

Le repo possède déjà :

- Seed Listing Mass Conversion V1 ;
- Seed Confirmation Query V2 ;
- thin seed index ;
- acquisition Common Crawl canary-first / fail-soft.

La prochaine étape consiste à **mesurer, fiabiliser et scaler l'existant**.

### 3.1 Funnel Truth Audit — premier gate obligatoire

Construire le tableau de vérité :

`discovered → normalized → unique seeds → confirmable → confirmation attempted → exact confirmed → structurally admissible → structured listing → display eligible → searchable`

Mesurer pour chaque étape :

- volume ;
- taux de conversion ;
- cause de rejet ;
- source ;
- ville ;
- transaction ;
- type ;
- âge / fraîcheur de preuve.

Le Funnel Truth Audit doit expliquer notamment pourquoi les compteurs actuels `21 946 candidates`, `44 fresh_confirmed` et `840 property_listings` ne sont pas directement alignés.

**Gate : aucune optimisation massive avant compréhension des pertes principales.**

### 3.2 Seed Hygiene

Avant de consommer de la capacité de confirmation :

- canonicalisation URL ;
- suppression paramètres / variantes inutiles ;
- seed-level dedup ;
- classification source ;
- classification URL ;
- exclusion des patterns explicitement hors scope ;
- matrice de couverture `source × ville × transaction × type`.

Important :

- **Seed dedup maintenant** ;
- **Property/entity dedup plus tard dans Property Graph V3**.

### 3.3 Bulk Seed Confirmation V2

Architecture cible :

`SEED RESERVOIR → NORMALIZATION → SEED DEDUP → BUCKETING → PRIORITY QUEUE → BULK EVIDENCE COLLECTION → evidence↔seed matching → confidence/freshness state → structured conversion`

Bucketing prioritaire :

`source × ville × type × transaction`

Principe : **une recherche / observation doit pouvoir confirmer plusieurs URLs quand la preuve le permet**, au lieu d'un modèle naïf 1 URL = 1 opération indépendante.

Conserver les garde-fous actuels :

- aucun fetch direct interdit de page listing ;
- aucune promotion sitemap-only ;
- exactitude / preuve suffisante ;
- aucune donnée métier manquante inventée ;
- admission existante respectée ;
- politiques source et provenance obligatoires.

### 3.4 Observation Ledger dès maintenant

La Freshness Machine complète arrive plus tard, mais toute confirmation doit dès maintenant préserver une preuve temporelle minimale :

- `observed_at` ;
- source ;
- `evidence_type` ;
- URL canonique ;
- statut ;
- confidence ;
- run / provenance.

But : ne pas devoir attendre plusieurs cycles futurs pour reconstruire l'historique de fraîcheur.

### 3.5 Structured Conversion milestones

Objectif immédiat :

`840 → 2 000 → 5 000 → 10 000+ structured listings`

Le KPI n'est pas seulement le nombre de listings.

À chaque palier, mesurer :

- coverage city/type/transaction/source ;
- completeness ;
- provenance ;
- display eligibility ;
- freshness evidence ;
- duplicate risk ;
- impact sur Golden Queries.

### Gate DATA-2

**Minimum stratégique : 5 000 annonces structurées** avec une couverture suffisamment diversifiée.

**Cible forte : 10 000+**.

---

# PHASE PROPERTY GRAPH — #23

## 4. Property Graph V3 / Dedup

Objectif : passer de :

`1 SourceOffer ≈ 1 cluster`

à :

`Avito X + Mubawab X + Agenz X + autre source X → 1 propriété canonique lorsque les preuves le justifient`

### États obligatoires

- `AUTO_MERGE` ;
- `POSSIBLE_MATCH` ;
- `DISTINCT`.

### Conditions minimales de rapprochement

- ville cohérente ;
- transaction cohérente ;
- type cohérent ;
- surface / prix / chambres corroborés lorsque disponibles ;
- localisation compatible ;
- autres attributs corroborants ;
- evidence trail explicite.

### Hard blocks

- contradictions fortes de ville ;
- vente ≠ location ;
- type incompatible ;
- écarts majeurs non expliqués ;
- fusion fondée uniquement sur similarité texte.

**Règle absolue : un faux merge est plus grave que deux doublons.**

### Objectif d'échelle

À terme :

`~100k observations → ~30–45k biens/offres uniques` à confirmer empiriquement, jamais comme chiffre garanti.

---

# PHASE FRESHNESS — #24

## 5. Freshness Machine

Chaque offre doit pouvoir évoluer entre :

- `fresh` ;
- `probably_fresh` ;
- `stale` ;
- `gone` ;
- `reappeared`.

Sources de preuve :

- OpenSERP ;
- sitemap ;
- Common Crawl ;
- partenaires / flux autorisés ;
- observations temporelles conservées.

But : **ne jamais publier un index massif rempli d'annonces mortes**.

---

# PHASE STRUCTURATION — #25

## 6. Intelligence at Scale

Transformer progressivement les listings en fiches AkarFinder enrichies :

- localisation normalisée ;
- quartier ;
- typologie ;
- prix/m² ;
- caractéristiques ;
- provenance ;
- AkarScore ;
- contexte marché ;
- qualité / complétude.

Principes :

- déclarer ce qui est observé ;
- distinguer ce qui est calculé / déduit ;
- ne jamais inventer une donnée manquante ;
- conserver provenance et confiance.

---

# PHASE NEIGHBORHOODS — #26

## 7. Morocco Neighborhood Intelligence

Étendre le graphe géographique :

`ville → quartier → micro-zone → mobilité → écoles → commerces → lifestyle → contexte prix`

Objectif : faire d'AkarFinder une **référence immobilière marocaine**, pas seulement un agrégateur de liens.

Cette phase ne doit pas retarder le gate DATA / Search Depth actuel.

---

# PHASE SEARCH DEPTH — #27

## 8. Recherche vraiment profonde

### Déjà largement construit

- backend non limité aux 200 premières lignes ;
- jusqu'à ~100 résultats locaux par tranche ;
- `Afficher plus` ;
- thin index ;
- Gateway jusqu'à ~150 résultats externes combinés.

### Matière actuellement disponible — repères

- Casablanca : ~967 URLs ;
- Rabat : 646 ;
- Tanger : 244 ;
- Marrakech : 4 309 ;
- Agadir : 6 653.

### Golden Query Set — démarre immédiatement

Créer et figer un jeu de **50–100 recherches représentatives** marocaines.

Exemples :

- appartement Casablanca 2 chambres ;
- villa Ain Diab ;
- appartement Agdal Rabat location ;
- terrain Marrakech ;
- appartement Tanger centre ;
- studio Maarif location ;
- villa Hay Riad ;
- appartement Guéliz ;
- villa Agadir ;
- terrain industriel Bouskoura.

Évaluer à chaque palier DATA :

- relevance ;
- depth ;
- diversity ;
- freshness ;
- noise ;
- duplicates ;
- geographic coverage.

Checkpoints :

`840 → baseline`

`2k → test`

`5k → certification intermédiaire`

`10k → certification forte`

`30k+ canonical properties → certification nationale`

### Gate Search Depth

**≥80 % des recherches communes doivent avoir une profondeur satisfaisante.**

La croissance DATA n'est validée que si elle améliore réellement `/search`.

---

# PHASE NATIONAL COVERAGE GAPS

## 9. Coverage Matrix

Piloter l'acquisition avec :

`VILLE × TRANSACTION × TYPE × SOURCE`

Le moteur doit combler les trous plutôt que maximiser aveuglément le volume.

Priorités :

1. principales villes et bassins ;
2. vente + location ;
3. appartements, villas, terrains, bureaux/commerces selon marché ;
4. diversité de sources ;
5. quartiers / micro-zones à forte demande.

---

# PHASE PRODUCTION — #28

## 10. Final Production Gate

Seulement lorsque DATA + Search Depth sont suffisamment matures.

Ordre :

1. intégrer uniquement les findings UX/UI retenus ;
2. Arabic / RTL core journey ;
3. account entry fix si encore nécessaire ;
4. audit responsive desktop/mobile ;
5. smoke tests ;
6. SEO / indexabilité ;
7. performance ;
8. final production certification.

Puis :

**1 seul déploiement Vercel consolidé.**

Aucun Vercel intermédiaire sans décision explicite.

---

# 11. Ordre canonique d'exécution

```text
✅ MASS DISCOVERY
21 946 seeds
        ↓
🔴 0. FUNNEL TRUTH AUDIT
        ↓
1. SEED HYGIENE / URL DEDUP / COVERAGE MATRIX
        ↓
2. BULK SEED CONFIRMATION V2
        ↓
3. OBSERVATION LEDGER / FRESHNESS EVIDENCE
        ↓
4. STRUCTURED CONVERSION
840 → 2k → 5k → 10k+
        ↓
5. PROPERTY GRAPH V3 / DEDUP
        ↓
6. FRESHNESS MACHINE
        ↓
7. INTELLIGENCE AT SCALE
        ↓
8. SEARCH DEPTH + GOLDEN QUERY CERTIFICATION
        ↓
9. NATIONAL COVERAGE GAP CLOSURE
        ↓
10. UX/UI FINDINGS RETAINED
        ↓
11. ARABIC / RTL / RESPONSIVE / SEO / PERFORMANCE / SMOKE
        ↓
12. FINAL CERTIFICATION
        ↓
🚀 ONE CONSOLIDATED VERCEL PRODUCTION DEPLOY
```

Golden Query Set et Coverage Matrix sont des **instruments transversaux** : ils démarrent dès maintenant et restent actifs pendant toute la montée DATA.

---

# 12. Gates officiels

## GATE DATA-1 — Funnel / acquisition

- funnel mesuré ;
- pertes principales expliquées ;
- seed hygiene en place ;
- bulk confirmation scalable ;
- aucune baisse de garde-fou.

## GATE DATA-2 — Masse structurée

- minimum 5 000 structured listings ;
- cible 10 000+ ;
- diversité géographique et typologique suffisante.

## GATE DATA-3 — Qualité

- provenance traçable ;
- ville / transaction / type fiables ;
- prix / surface présents quand réellement disponibles ;
- aucune donnée inventée ;
- display eligibility explicite ;
- duplicate risk mesuré.

## GATE DATA-4 — Search

- ≥80 % Golden Queries satisfaisantes ;
- profondeur suffisante ;
- bruit acceptable ;
- diversité suffisante ;
- fraîcheur acceptable ;
- doublons maîtrisés.

## GATE DATA-5 — Property Graph

- stratégie de rapprochement conservatrice ;
- hard blocks actifs ;
- `POSSIBLE_MATCH` séparé ;
- échantillon audité manuellement avant auto-merge massif ;
- evidence trail obligatoire.

## GATE PROD

- findings UX/UI retenus traités ;
- Arabic / RTL ;
- responsive ;
- SEO / indexabilité ;
- performance ;
- smoke ;
- certification finale.

---

# 13. Décision stratégique actuelle

Le prochain jalon stratégique est :

> **AkarFinder atteint au minimum 5 000 annonces structurées + un thin index national profond + une recherche réellement satisfaisante sur les principales villes.**

Ensuite seulement : Property Graph V3, Freshness Machine, Intelligence Scale, couverture nationale finale et gates Production.

---

# 14. Règles d'exécution immédiates

- ne pas ajouter de nouvelles features produit ;
- ne pas coder de nouvelle architecture avant Funnel Truth Audit ;
- ne pas affaiblir les garde-fous pour augmenter artificiellement le volume ;
- ne pas confondre seed, observation, listing, propriété canonique et résultat publié ;
- ne pas revendiquer 100k tant que le compteur exact et sa définition ne sont pas prouvés ;
- aucun déploiement Vercel intermédiaire ;
- toute mission de code doit recevoir un ODM ciblé après décision ici ;
- la réflexion, l'architecture, les arbitrages et les gates restent pilotés dans ChatGPT ;
- les agents d'exécution ne décident pas de l'architecture.

---

## Prochaine mission de code — NON LANCÉE

**`DATA-FUNNEL-TRUTH-AUDIT-1`**

Statut : `WAITING_FOR_GO`.

Avant GO, les artefacts de préparation peuvent être produits en documentation uniquement :

- Data Funnel Spec ;
- Golden Query Set ;
- Data Scorecard / gates ;
- mapping des compteurs / états ;
- protocole d'évaluation Search Depth.
