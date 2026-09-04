# AkarFinder — Data Ingestion Canonical

**Status:** ACTIVE — authoritative roadmap

**Branch:** `feat/data-ingestion-canonical`

**Purpose:** boussole canonique pour toute ingestion de données immobilières externes vers AkarFinder.

---

## 1. Goal produit

Construire une couche d’ingestion source-agnostique capable de découvrir, extraire, normaliser, dédupliquer, mettre à jour, désactiver et purger des annonces immobilières provenant de plusieurs sources sans coupler AkarFinder à un portail particulier.

### Goal final de masse critique

AkarFinder vise **au minimum 100 000 annonces canoniques exploitables** dans son index, avec :

- provenance complète ;
- déduplication maîtrisée ;
- lifecycle actif ;
- recherche / filtres / ranking fonctionnels ;
- purge indépendante par source ;
- aucune dépendance destructrice entre données portail et données directes / partenaires.

Le seuil `100K` concerne le **stock canonique AkarFinder multi-source**, pas une promesse arbitraire de 100 000 annonces provenant de Mubawab seul.

La stratégie est donc :

```text
Source pilote Mubawab exhaustive dans le périmètre autorisé
        ↓
mesure du stock canonique réel
        ↓
certification massive
        ↓
ingestion AkarFinder contrôlée
        ↓
si stock < 100K : ajout progressif d’autres sources
        ↓
≥ 100K annonces canoniques exploitables
```

---

## 2. Critères de réussite globaux

Le chantier n’est considéré comme réussi que si :

1. une source peut être ajoutée via un adaptateur dédié sans modifier le modèle canonique AkarFinder ;
2. chaque annonce importée garde une provenance complète ;
3. une annonce existante peut être mise à jour sans créer de doublon artificiel ;
4. une annonce disparue peut évoluer `active → stale → inactive` ;
5. toutes les annonces portail d’une source donnée peuvent être purgées sans affecter les autres sources ;
6. les annonces `agency_direct`, `partner_feed` et autres données directes restent indépendantes des annonces portail ;
7. découverte, crawl et ingestion peuvent reprendre après interruption ;
8. toute montée en volume est précédée d’une preuve sur périmètre plus petit ;
9. aucune donnée ne rejoint l’index public sans normalisation et quality gate ;
10. le système peut atteindre puis maintenir **≥ 100 000 annonces canoniques exploitables** en combinant les sources nécessaires.

---

## 3. Architecture verrouillée

```text
Discovery
  ↓
Extraction
  ↓
Collection Listing Contract
  ↓
Validation
  ↓
Source Adapter
  ↓
CanonicalPropertyV1 / CanonicalOfferV1 / MediaAssetV1
  ↓
Deduplication / Lifecycle / Provenance
  ↓
Controlled AkarFinder Ingestion
  ↓
Search / Ranking / UI
```

Le modèle canonique applicatif reste :

```text
lib/property-schema/
```

Le fichier :

```text
data-ingestion/schema/listing.schema.json
```

est uniquement le **Collection / Input Contract**. Il ne doit jamais devenir un second modèle canonique concurrent.

Le cœur AkarFinder ne doit jamais connaître la structure HTML ou API spécifique d’un portail.

---

## 4. Séparation des sources

Valeurs de `source_type` :

- `portal`
- `agency_direct`
- `partner_feed`
- `owner_direct`
- `developer_direct`
- `open_data`
- `manual`

Une annonce trouvée sur un portail reste une observation `portal`.

Si la même agence fournit ensuite directement cette annonce à AkarFinder, cette version directe devient une provenance indépendante après matching.

### Règle absolue

Une purge telle que :

```text
purge source=mubawab
```

ne doit jamais supprimer une annonce `agency_direct`, `partner_feed`, `owner_direct` ou toute autre provenance indépendante représentant éventuellement le même bien.

---

## 5. Identité et déduplication

### Niveau 1 — source exacte

```text
source_name + source_id
```

Même couple → même annonce source.

### Niveau 2 — URL canonique

Même URL canonique → très forte probabilité de même observation source.

### Niveau 3 — fingerprint immobilier

Comparer notamment :

- ville / quartier ;
- coordonnées ;
- type ;
- transaction ;
- surface ;
- prix ;
- chambres ;
- texte ;
- images ;
- agence / vendeur.

### Niveau 4 — cross-source matching

Plusieurs annonces peuvent représenter un même bien tout en conservant leurs provenances distinctes.

```text
Property Entity
  ├── Mubawab listing
  ├── autre portail listing
  └── Agency direct listing
```

---

## 6. Lifecycle

Champs temporels obligatoires :

- `first_seen_at`
- `last_seen_at`
- `scraped_at`
- `content_hash`

Règles :

```text
retrouvée inchangée → update last_seen_at
retrouvée modifiée  → update champs + content_hash + last_seen_at
non retrouvée       → active → stale → inactive selon politique source
```

Aucune disparition ponctuelle ne justifie une suppression destructive immédiate.

---

## 7. Images et médias

Chaque image conserve au minimum :

```json
{
  "url": null,
  "position": 1,
  "hash": null
}
```

Le modèle canonique reste indépendant de la stratégie de cache / proxy / stockage.

Les droits de publication, cache et téléchargement restent explicites dans `MediaAssetV1`.

---

## 8. Seller / agence

Ne jamais confondre :

- annonce ;
- bien immobilier ;
- agence ;
- portail source.

Le matching agence est indépendant du matching annonce.

Objectif durable : convertir progressivement les agences découvertes en relations directes avec AkarFinder sans dépendre du portail d’origine.

---

## 9. Format des runs

Chaque run doit être identifiable, mesuré et reprenable.

Structure recommandée hors Git pour les datasets volumineux :

```text
data-ingestion/runs/<source>/<run-id>/
  manifest.json
  listings-0001.jsonl
  listings-0002.jsonl
  ...
  errors.jsonl
```

Le repository conserve :

- code ;
- schémas ;
- fixtures ;
- petits échantillons ;
- manifests / rapports nécessaires à la preuve.

Il ne conserve pas les dumps massifs par défaut.

Le manifest doit mesurer au minimum :

- pages découvertes / traitées ;
- annonces découvertes / extraites / normalisées / rejetées ;
- doublons ;
- erreurs ;
- couverture ville / transaction / type ;
- durée ;
- checkpoint de reprise ;
- qualité moyenne / warnings ;
- stock canonique unique obtenu.

---

## 10. Quality gate

Une annonce ne doit pas être publiée automatiquement si elle échoue aux contrôles essentiels :

- source connue ;
- URL valide ;
- transaction reconnue ;
- type reconnu ou explicitement `unknown` ;
- ville identifiable ;
- prix typé ou `on_request` ;
- surfaces numériques cohérentes ;
- absence de valeurs impossibles évidentes ;
- fingerprint calculable ;
- provenance complète.

Les rejets restent auditables avec motif d’échec.

---

## 11. Sécurité opérationnelle

- aucun secret / cookie de session dans Git ;
- aucune collecte sur chemin explicitement interdit ou non autorisé ;
- aucune tentative de contournement d’authentification, CAPTCHA ou contrôle d’accès ;
- montée en volume progressive et mesurée ;
- chaque source possède un kill-switch ;
- chaque source est purgeable indépendamment ;
- aucun write production sans gate et autorisation explicite ;
- aucun déploiement Vercel implicite ;
- aucun merge implicite ;
- ne jamais toucher à la SQLite historique `scripts/scrapers/output/akarfinder.db` pendant les preuves sandbox ;
- les données portail restent séparées des données directes / partenaires.

---

# 12. Roadmap canonique par lots

Chaque lot possède un **Goal**, un **Succès** observable et une **Preuve**. Aucun lot n’est CLOSED sans preuve.

## Lot 1 — Canonique & contrat de données

**Status : ✅ CLOSED**

**Goal :** représenter sans ambiguïté une annonce provenant de n’importe quelle source.

**Preuve :** schéma Collection/Input, fixtures, adaptateur vers le modèle canonique et gate dédié.

---

## Lot 2 — Mubawab Discovery

**Status : ✅ CLOSED**

**Goal :** découvrir de manière déterministe les annonces du périmètre Mubawab testé.

**Preuve :** discovery reproductible, pagination / URLs / identifiants / doublons mesurés.

---

## Lot 3 — Mubawab Extractor

**Status : ✅ CLOSED**

**Goal :** convertir une page source en objet Collection puis canonique sans perte de champ essentiel.

**Preuve :** fixtures et gate extractor dédiés.

---

## Lot 4 — Crawl pilote

**Status : ✅ CLOSED**

**Goal :** prouver le crawler sur un périmètre limité avant toute montée en charge.

**Preuve :** runs pilotes contrôlés avec manifests / compteurs / reprise.

---

## Lot 5 — Déduplication & lifecycle

**Status : ✅ CLOSED**

**Goal :** rendre les runs idempotents et gérer mises à jour, stale / inactive et séparation des provenances.

**Preuve :** gate lifecycle montrant inserts / unchanged / updates / transitions et protection cross-source.

---

## Lot 6 — Crawl Mubawab élargi hors production

**Status : ✅ CLOSED**

**Goal :** démontrer un crawl chunké, reprenable et multi-type hors production.

**Preuve :** gates crawl / shakedown / couverture élargie.

**Note :** toute anomalie taxonomique historique reste un chantier de qualité séparé et ne modifie pas la fermeture fonctionnelle du lot.

---

## Lot 7 — Ingestion AkarFinder sandbox

**Status : ✅ CLOSED**

**Goal :** prouver que les données canoniques alimentent AkarFinder sans toucher à la production.

**Preuve :** sandbox 20 / 100 / 1000, DB/API/Search/ranking/lifecycle/purge et preuve navigateur finale.

---

## Lot 8 — Ingestion massive contrôlée

**Status : ✅ CLOSED**

**Goal :** rendre l’ingestion large contrôlable avant tout passage à un dataset réellement massif.

Capacités prouvées :

- batching ;
- idempotence ;
- checkpoint / reprise ;
- kill-switch ;
- rollback du batch courant ;
- métriques ;
- purge source sélective ;
- survie `agency_direct` / `partner_feed` ;
- sandbox SQLite isolée.

**Preuve de fermeture :** workflow `Data Ingestion Lot 8 Controlled Massive Gate`, run `33879281908` — SUCCESS sur le HEAD produit `979c7f57e46f5eb39c6d0a552fe78b635185e634`.

---

## Lot 9 — Mubawab Full Coverage

**Status : 🟡 OPEN — chantier courant**

**Goal :** parcourir exhaustivement le périmètre Mubawab accessible et autorisé afin de mesurer le stock réel disponible avant d’ouvrir une deuxième source.

Le Lot 9 doit couvrir systématiquement :

- vente + location ;
- toutes les familles de biens supportées ;
- toutes les villes / zones découvertes ;
- pagination profonde ;
- reprise par checkpoint ;
- déduplication de navigation ;
- extraction / normalisation ;
- erreurs et rejets ;
- couverture mesurée ;
- kill-switch ;
- aucun write production.

### Stratégie de montée en volume

Le crawl ne démarre pas par une invocation aveugle « tout le site ».

Il progresse par partitions reproductibles :

```text
transaction × type × ville/zone × page-range
```

Chaque partition possède :

- identifiant stable ;
- état `pending / running / completed / failed` ;
- checkpoint ;
- compteurs ;
- erreurs ;
- possibilité de reprise sans recommencer les partitions déjà certifiées.

**Succès :** toutes les partitions découvertes du périmètre autorisé sont soit `completed`, soit explicitement `failed/rejected` avec raison, et le stock canonique Mubawab unique est mesuré.

**Preuve :** manifest Full Coverage final indiquant au minimum couverture, pages, annonces brutes, annonces normalisées, uniques, doublons, rejets, erreurs, checkpoints et distribution par ville / transaction / type.

**Important :** le Lot 9 n’exige pas 100K annonces Mubawab. Il exige de connaître **le maximum réel, unique et exploitable de la source pilote**.

**NEXT EXACT :** construire puis certifier le planificateur de partitions Full Coverage hors production avant de déclencher toute collecte exhaustive.

---

## Lot 10 — Mubawab Massive Dataset Certification

**Status : ⚪ À FAIRE**

**Goal :** certifier le dataset complet produit au Lot 9 avant ingestion AkarFinder massive.

Valider notamment :

- unicité canonique ;
- taux de doublons ;
- couverture ;
- qualité des champs ;
- distribution géographique ;
- distribution types / transactions ;
- anomalies de prix / surfaces ;
- provenance ;
- lifecycle ;
- capacité de purge ;
- volume canonique final.

**Succès :** dataset jugé exploitable avec rapport quantifié et anomalies connues.

**Preuve :** rapport de certification massif reproductible.

---

## Lot 11 — Massive AkarFinder Ingestion

**Status : ⚪ À FAIRE**

**Goal :** injecter le dataset certifié dans l’environnement AkarFinder cible de manière contrôlée et mesurer Search à grande échelle.

Valider :

- batching / reprise / rollback ;
- temps d’ingestion ;
- stock avant / après ;
- Search / filtres / ranking ;
- performances ;
- lifecycle ;
- purge complète source ;
- protection des données directes / partenaires.

Aucun passage production ne découle automatiquement de ce lot : toute activation production reste une décision explicite séparée.

**Succès :** dataset massif exploitable par AkarFinder sans corruption ni régression fonctionnelle majeure.

**Preuve :** rapport d’ingestion + tests DB/API/Search + rollback/purge.

---

## Lot 12 — Industrialisation multi-source vers ≥100K

**Status : ⚪ À FAIRE**

**Goal :** combler le delta entre le stock certifié issu de Mubawab et le seuil produit **≥100 000 annonces canoniques exploitables**.

Si Mubawab seul fournit déjà ≥100K uniques exploitables, le seuil produit est atteint mais l’architecture multi-source doit néanmoins rester prête à être prouvée séparément.

Si Mubawab fournit moins de 100K, ajouter les sources suivantes par priorité stratégique et conformité, sans modifier le cœur canonique.

Pour chaque nouvelle source, seules doivent varier :

1. Discovery ;
2. Extractor ;
3. mapping vers le Collection Contract ;
4. fixtures / tests ;
5. règles de fraîcheur / purge / droits.

```text
MubawabAdapter
OtherPortalAdapter
AgencyFeedAdapter
PartnerFeedAdapter
        ↓
Collection Contract
        ↓
Canonical model
        ↓
Same ingestion pipeline
```

**Succès :** AkarFinder atteint **≥100K annonces canoniques exploitables** sans réécriture structurelle du moteur d’ingestion.

**Preuve :** stock canonique mesuré ≥100K + au moins une intégration supplémentaire utilisant le même pipeline si nécessaire pour atteindre le seuil.

---

## 13. Gates d’exécution

Ordre canonique :

```text
Lots 1–8 CLOSED
      ↓
Lot 9  — Full Coverage source pilote
      ↓
Lot 10 — Certification dataset massif
      ↓
Lot 11 — Ingestion AkarFinder massive contrôlée
      ↓
Lot 12 — Multi-source jusqu’à ≥100K
```

Règles :

- pas de collecte exhaustive tant que le plan de partitions Lot 9 n’est pas prouvé ;
- pas de certification massive sans manifest Full Coverage ;
- pas d’ingestion massive AkarFinder d’un dataset non certifié ;
- pas de deuxième portail avant mesure du stock réel de la source pilote, sauf blocage documenté ;
- pas de production write / merge / déploiement implicite ;
- le seuil `100K` se mesure après normalisation et déduplication, jamais sur le compteur brut de pages découvertes.

---

## 14. Definition of Done — phase ≥100K

La phase actuelle est CLOSED uniquement lorsqu’on possède :

- architecture canonique versionnée ;
- source pilote couverte et mesurée ;
- dataset massif certifié ;
- ingestion massive contrôlée prouvée ;
- purge / rollback / reprise prouvés ;
- données directes / partenaires protégées ;
- Search fonctionnel à grande échelle ;
- **stock ≥100 000 annonces canoniques exploitables**.

---

## 15. Décision canonique actuelle

**AkarFinder devient source-agnostic, mais ne disperse pas ses efforts trop tôt.**

La priorité opérationnelle actuelle est :

> **terminer la couverture Mubawab, mesurer le stock réel, certifier ce dataset, l’ingérer de manière contrôlée, puis seulement ajouter les sources nécessaires pour atteindre ou dépasser 100K.**

Mubawab reste une source pilote. Le produit durable reste le moteur d’ingestion, la normalisation, la déduplication, le lifecycle, la provenance, la qualité et la capacité à convertir progressivement les agences découvertes en relations directes AkarFinder.
