# AkarFinder — Data Ingestion Canonical

**Status:** ACTIVE / foundation

**Branch:** `feat/data-ingestion-canonical`

**Purpose:** boussole canonique pour toute ingestion de données immobilières externes vers AkarFinder.

---

## 1. Goal

Construire une couche d’ingestion multi-source capable de découvrir, extraire, normaliser, dédupliquer, mettre à jour et retirer des annonces immobilières provenant de plusieurs sources, sans coupler AkarFinder à un portail particulier.

La première expérimentation ciblée est Mubawab. Si elle fonctionne, le même contrat d’ingestion doit pouvoir accueillir d’autres grands portails, agences, partenaires, feeds et sources autorisées sans réécrire le cœur AkarFinder.

---

## 2. Critères de réussite

Le chantier n’est considéré comme réussi que si :

1. une source peut être ajoutée via un adaptateur dédié sans modifier le modèle canonique AkarFinder ;
2. chaque annonce importée garde une provenance complète ;
3. une annonce existante peut être mise à jour sans créer de doublon ;
4. une annonce disparue peut être marquée inactive ou retirée ;
5. toutes les annonces issues d’une source donnée peuvent être purgées sans affecter les autres sources ;
6. les annonces directes, partenaires ou provenant d’agences signées restent indépendantes des annonces collectées sur un portail tiers ;
7. l’ingestion peut reprendre après interruption sans recommencer tout le crawl ;
8. le résultat peut être validé sur un petit échantillon avant toute ingestion massive ;
9. aucune donnée n’entre dans l’index public AkarFinder sans passer les contrôles de normalisation et de qualité.

---

## 3. Principe d’architecture

```text
Source externe
    ↓
Source Adapter
    ↓
Raw Listing
    ↓
Normalizer
    ↓
Canonical Listing
    ↓
Deduplication / Matching
    ↓
Validation
    ↓
AkarFinder ingestion store
    ↓
Search / Ranking / UI
```

Le cœur AkarFinder ne doit jamais connaître la structure HTML ou API spécifique d’un portail.

Chaque portail possède son propre adaptateur.

Exemples futurs :

```text
MubawabAdapter
AvitoAdapter
SaroutyAdapter
AgencyFeedAdapter
PartnerFeedAdapter
OpenDataAdapter
        ↓
CanonicalListing
```

---

## 4. Organisation du dossier

Structure cible :

```text
data-ingestion/
  canonical.md
  schema/
    listing.schema.json
  sources/
    mubawab/
      README.md
      config.json
      fixtures/
    avito/
    sarouty/
  runs/
    .gitkeep
  samples/
    .gitkeep
```

Les données massives de crawl ne doivent pas être commitées dans Git par défaut.

Git conserve le code, le schéma, les fixtures de test, les petits échantillons et les manifestes nécessaires à la reproductibilité.

---

## 5. Identité canonique d’une annonce

Une annonce AkarFinder importée doit avoir deux identités distinctes :

### Identité interne

`akar_id`

Identifiant stable propre à AkarFinder.

### Identité source

- `source_name`
- `source_id`
- `source_url`

Clé source recommandée :

```text
source_name + source_id
```

Si la source ne fournit pas d’identifiant stable, dériver une clé déterministe à partir de l’URL canonique ou d’une empreinte stable.

---

## 6. Schéma canonique minimal

```json
{
  "akar_id": null,
  "source": {
    "name": null,
    "source_id": null,
    "url": null,
    "first_seen_at": null,
    "last_seen_at": null,
    "scraped_at": null,
    "content_hash": null
  },
  "status": "active",
  "transaction": null,
  "property_type": null,
  "title": null,
  "description": null,
  "price": {
    "amount": null,
    "currency": "MAD",
    "period": null,
    "on_request": false
  },
  "surface": {
    "total_m2": null,
    "habitable_m2": null,
    "land_m2": null
  },
  "rooms": null,
  "bedrooms": null,
  "bathrooms": null,
  "floor": null,
  "location": {
    "country": "Morocco",
    "region": null,
    "city": null,
    "district": null,
    "address_text": null,
    "latitude": null,
    "longitude": null,
    "precision": null
  },
  "features": [],
  "images": [],
  "seller": {
    "name": null,
    "type": null,
    "source_profile_url": null
  },
  "provenance": {
    "source_type": null,
    "source_listing_url": null,
    "retrieval_method": null
  },
  "quality": {
    "score": null,
    "warnings": []
  },
  "raw": {}
}
```

Le schéma JSON formel sera créé séparément dans `schema/listing.schema.json`.

---

## 7. Provenance obligatoire

Aucune annonce importée ne doit perdre sa provenance.

Valeurs possibles de `source_type` :

- `portal`
- `agency_direct`
- `partner_feed`
- `owner_direct`
- `developer_direct`
- `open_data`
- `manual`

Une annonce issue d’un portail tiers reste marquée `portal` même si l’agence présente dans l’annonce devient ultérieurement partenaire AkarFinder.

Si l’agence fournit ensuite directement la même annonce, cette nouvelle version peut devenir une annonce `agency_direct`, après matching et validation, sans dépendre du portail d’origine.

---

## 8. Règle de purge par source

La suppression d’une source doit être une opération native du système.

Exemple :

```text
purge source = mubawab
```

Cette opération doit pouvoir supprimer ou désactiver toutes les annonces dont :

```text
source.name == "mubawab"
AND provenance.source_type == "portal"
```

Elle ne doit jamais supprimer :

- les annonces `agency_direct` ;
- les annonces `partner_feed` ;
- les annonces `owner_direct` ;
- les annonces devenues indépendantes d’un portail après ingestion directe autorisée.

Cette séparation est obligatoire dès la première version.

---

## 9. Déduplication

La déduplication se fait en plusieurs niveaux.

### Niveau 1 — exact source match

Même `source_name + source_id` → même annonce source.

### Niveau 2 — URL canonique

Même URL canonique → très forte probabilité de doublon.

### Niveau 3 — fingerprint immobilier

Comparer notamment :

- ville ;
- quartier ;
- latitude/longitude si disponibles ;
- type de bien ;
- transaction ;
- surface ;
- prix ;
- chambres ;
- texte ;
- images ;
- agence / vendeur.

### Niveau 4 — cross-source matching

Deux annonces de portails différents peuvent représenter le même bien.

Le système doit pouvoir les relier sans forcément supprimer leur provenance individuelle.

Objectif futur :

```text
Property Entity
  ├── Mubawab listing
  ├── Avito listing
  ├── Sarouty listing
  └── Agency direct listing
```

---

## 10. Gestion du temps et de la fraîcheur

Champs obligatoires :

- `first_seen_at`
- `last_seen_at`
- `scraped_at`
- `content_hash`

À chaque nouveau passage :

### annonce retrouvée inchangée

Mettre à jour `last_seen_at` uniquement.

### annonce retrouvée modifiée

Mettre à jour les champs concernés + `content_hash` + `last_seen_at`.

### annonce non retrouvée

Ne pas supprimer immédiatement.

Passer progressivement par exemple :

```text
active → stale → inactive
```

Le seuil exact sera défini après observation réelle des sources.

---

## 11. Images

Chaque image doit conserver au minimum :

```json
{
  "url": null,
  "position": 1,
  "hash": null
}
```

La stratégie de stockage local, proxy, cache ou simple référence distante sera décidée séparément.

Ne pas lier le modèle canonique à une stratégie de stockage d’image particulière.

---

## 12. Seller / agence

Ne pas confondre :

- l’annonce ;
- le bien immobilier ;
- l’agence ;
- la source où l’annonce a été trouvée.

Une agence peut apparaître sur plusieurs portails.

À terme :

```text
Agency Entity
  ├── Mubawab profile
  ├── Avito profile
  ├── Sarouty profile
  └── AkarFinder partner profile
```

Le matching d’agence doit donc être séparé du matching d’annonce.

---

## 13. Pipeline d’un crawl

Chaque run doit produire un manifeste.

Exemple :

```json
{
  "run_id": "mubawab-2026-09-03-001",
  "source": "mubawab",
  "started_at": null,
  "completed_at": null,
  "pages_discovered": 0,
  "pages_processed": 0,
  "listings_discovered": 0,
  "listings_fetched": 0,
  "listings_normalized": 0,
  "listings_rejected": 0,
  "duplicates": 0,
  "errors": []
}
```

Le run doit être reprenable après interruption.

---

## 14. Format de sortie des crawls

Pour les volumes importants, préférer JSONL à un unique énorme fichier JSON.

Structure possible :

```text
runs/mubawab/2026-09-03/
  manifest.json
  listings-0001.jsonl
  listings-0002.jsonl
  errors.jsonl
```

Une ligne = une annonce canonique.

Avantages :

- streaming ;
- reprise ;
- traitement par chunks ;
- erreurs isolées ;
- ingestion progressive ;
- mémoire maîtrisée.

---

## 15. Quality gate

Une annonce ne doit pas être publiée automatiquement si elle échoue aux contrôles essentiels.

Contrôles minimaux :

- source connue ;
- URL valide ;
- transaction reconnue ;
- type de bien reconnu ou explicitement `unknown` ;
- ville identifiable ;
- prix correctement typé ou marqué `on_request` ;
- surfaces numériques cohérentes ;
- absence de valeurs impossibles évidentes ;
- fingerprint calculable ;
- provenance complète.

Les annonces rejetées sont conservées dans les logs du run avec motif d’échec.

---

## 16. MVP Mubawab

Le premier test ne doit PAS commencer par tout le site.

Séquence canonique :

### Phase M0 — découverte

- comprendre catégories et pagination ;
- identifier les URLs d’annonces ;
- identifier les champs disponibles ;
- identifier les variations entre types de biens et transactions.

### Phase M1 — échantillon contrôlé

Extraire environ 20 annonces réparties entre plusieurs types et villes.

Comparer manuellement :

```text
page source ↔ raw extraction ↔ canonical JSON
```

Objectif : exactitude des champs, pas volume.

### Phase M2 — pagination limitée

Crawler plusieurs pages d’une catégorie et tester :

- déduplication ;
- reprise ;
- erreurs ;
- stabilité des IDs ;
- évolution d’une annonce entre deux runs.

### Phase M3 — couverture élargie

Étendre progressivement aux catégories, villes et transactions.

### Phase M4 — ingestion AkarFinder de test

Charger le dataset dans un environnement isolé AkarFinder.

Valider recherche, filtres, ranking, détails et purge par source.

### Phase M5 — décision

Seulement après preuve : décider si la source peut être intégrée durablement, conservée comme expérimentation, remplacée par un partenariat/feed, ou entièrement purgée.

---

## 17. Règles de sécurité opérationnelle

- Aucun crawl massif avant validation d’un échantillon.
- Aucun write direct dans la base production pendant le développement du connecteur.
- Aucun secret ou cookie de session dans Git.
- Aucun fichier massif de crawl dans le repository.
- Chaque run doit être identifiable et reproductible.
- Chaque source doit disposer d’un interrupteur de désactivation.
- Chaque source doit pouvoir être purgée indépendamment.
- Les données partenaires/directes doivent être séparées des données portail.

---

## 18. Ce que ce chantier ne doit pas devenir

Ne pas :

- coder Mubawab directement dans les composants de recherche ;
- importer aveuglément tout champ fourni par une source ;
- traiter une URL comme l’identité universelle d’un bien immobilier ;
- mélanger annonce et propriété réelle ;
- mélanger agence et portail ;
- garder éternellement une annonce disparue ;
- dépendre d’un unique gros fichier JSON mutable ;
- publier des données dont la provenance est inconnue.

---

## 19. Roadmap canonique par lots

Chaque lot possède un **Goal**, un **Succès observable** et une **Preuve**. Un lot n’est considéré CLOSED que lorsque sa preuve existe.

### Lot 1 — Canonique & contrat de données

**Status : 🟡 EN COURS**

**Goal :** définir précisément ce qu’est une annonce AkarFinder, indépendamment de toute source.

Travail :

- `data-ingestion/canonical.md` ;
- `data-ingestion/schema/listing.schema.json` ;
- enums transaction / type de bien / statut / vendeur / devise ;
- règles `source_id`, `first_seen_at`, `last_seen_at`, `status`, `content_hash` ;
- règles de provenance ;
- règle de purge par source ;
- fixture canonique minimale ;
- fixture canonique complète ;
- schéma du manifest de run.

**Succès :** une annonce provenant de n’importe quelle source peut être représentée sans ambiguïté dans le modèle canonique.

**Preuve :** validation du JSON Schema sur plusieurs fixtures couvrant vente, location, appartement, villa, terrain et annonce partiellement renseignée.

**Next exact :** créer `data-ingestion/schema/listing.schema.json`.

---

### Lot 2 — Mubawab Discovery

**Status : ⚪ À FAIRE**

**Goal :** comprendre et cartographier de manière déterministe comment découvrir les annonces Mubawab.

Travail :

- catégories vente / location ;
- types de biens ;
- villes et zones ;
- pagination ;
- liens d’annonces ;
- identifiants source ;
- variantes d’URL ;
- doublons de navigation ;
- structure d’un `manifest.json` de découverte.

À ce stade, aucune ingestion AkarFinder n’est nécessaire.

**Succès :** le système sait énumérer de façon reproductible les URLs d’annonces d’un périmètre donné sans doublons de navigation évidents.

**Preuve :** manifest d’un crawl de découverte limité avec compteurs pages / URLs / doublons / erreurs.

---

### Lot 3 — Mubawab Extractor

**Status : ⚪ À FAIRE**

**Goal :** transformer une page annonce Mubawab en un objet canonique complet.

Extraire et normaliser au minimum :

- identifiant source ;
- URL source ;
- titre ;
- description ;
- transaction ;
- type de bien ;
- prix ;
- surface ;
- pièces ;
- chambres ;
- salles de bain ;
- étage si disponible ;
- ville ;
- quartier ;
- coordonnées si disponibles ;
- caractéristiques ;
- images ;
- agence / vendeur ;
- données brutes utiles ;
- `content_hash`.

**Succès :** environ 20 annonces représentatives sont converties sans perte de champ important.

**Preuve :** comparaison manuelle `page source ↔ raw extraction ↔ canonical JSON` sur l’échantillon contrôlé.

---

### Lot 4 — Crawl pilote

**Status : ⚪ À FAIRE**

**Goal :** valider le crawler sur un périmètre volontairement limité avant toute collecte massive.

Périmètre initial recommandé :

```text
Casablanca
Appartement
Vente
100 à 500 annonces
```

Mesurer :

- pages découvertes ;
- pages réussies ;
- annonces découvertes ;
- annonces extraites ;
- annonces invalides ;
- champs manquants ;
- doublons ;
- erreurs ;
- durée ;
- capacité de reprise.

**Succès :** dataset JSONL propre, déterministe et reproductible sur le périmètre pilote.

**Preuve :** `manifest.json`, fichiers JSONL et rapport de validation du run pilote.

---

### Lot 5 — Déduplication & lifecycle

**Status : ⚪ À FAIRE**

**Goal :** rendre les runs répétés idempotents et gérer la vie d’une annonce dans le temps.

Cas obligatoires :

- même annonce revue → update, pas insert ;
- annonce inchangée → mise à jour de `last_seen_at` ;
- prix ou contenu modifié → nouvel état + nouveau `content_hash` ;
- annonce absente → `active → stale → inactive` selon seuil défini ;
- même bien publié plusieurs fois → rapprochement ;
- annonces cross-source → matching sans perte de provenance ;
- séparation stricte `portal` / `agency_direct` / `partner_feed` / `owner_direct`.

**Succès :** relancer plusieurs fois le même crawl n’augmente pas artificiellement le stock.

**Preuve :** au moins deux runs successifs montrant inserts, unchanged, updates, stale/inactive et doublons correctement classés.

---

### Lot 6 — Crawl Mubawab complet hors production

**Status : ⚪ À FAIRE**

**Goal :** produire un dataset Mubawab large, mesuré et auditable sans l’injecter directement en production.

Structure cible :

```text
data-ingestion/runs/mubawab/<date>/
  manifest.json
  listings-0001.jsonl
  listings-0002.jsonl
  ...
  errors.jsonl
```

Le crawl doit être découpé en chunks et reprenable.

**Succès :** couverture des catégories / villes / transactions ciblées avec taux de réussite et taux d’erreur connus.

**Preuve :** manifest final avec volumes, couverture, erreurs, rejets, doublons et qualité moyenne du dataset.

---

### Lot 7 — Ingestion AkarFinder sandbox

**Status : ⚪ À FAIRE**

**Goal :** prouver que les données canoniques peuvent alimenter AkarFinder sans toucher à la production.

Progression :

```text
20 annonces
→ 100 annonces
→ 1 000 annonces
```

Valider :

- import ;
- recherche ;
- filtres ;
- ranking ;
- pages détail ;
- images ;
- provenance ;
- mises à jour ;
- suppression / désactivation ;
- purge par source.

**Succès :** le dataset s’intègre sans casser les données, filtres ou recherches existants.

**Preuve :** tests DB/API/UI sur environnement isolé + test complet `purge source=mubawab`.

---

### Lot 8 — Ingestion massive contrôlée

**Status : ⚪ À FAIRE**

**Goal :** rendre possible une ingestion large depuis un dataset validé avec rollback et contrôle opérationnel.

Obligatoire :

- ingestion par batch ;
- idempotence ;
- reprise ;
- rollback ;
- métriques ;
- logs ;
- source kill-switch ;
- purge complète par source ;
- aucune suppression collatérale de données directes / partenaires.

**Succès :** ingestion d’un dataset large sans corruption, explosion de doublons ni perte d’annonces existantes.

**Preuve :** rapport d’ingestion + comparaison avant/après + rollback/purge testé.

---

### Lot 9 — Industrialisation multi-source

**Status : ⚪ À FAIRE**

**Goal :** réutiliser le moteur pour les autres grandes sources sans réécrire le cœur AkarFinder.

Architecture cible :

```text
MubawabAdapter
AvitoAdapter
SaroutyAdapter
AgencyFeedAdapter
PartnerFeedAdapter
        ↓
CanonicalListing
        ↓
AkarFinder ingestion pipeline
```

Pour une nouvelle source, seules les briques spécifiques suivantes doivent être nécessaires :

1. Discovery ;
2. Extractor ;
3. mapping vers le schéma canonique ;
4. fixtures / tests ;
5. configuration de fraîcheur et purge.

**Succès :** une seconde source est intégrée sans modification structurelle du cœur canonique.

**Preuve :** au moins deux sources différentes produisent des `CanonicalListing` valides et passent le même pipeline d’ingestion.

---

## 20. Gates d’exécution

Ordre obligatoire :

```text
Lot 1
  ↓
Lot 2
  ↓
Lot 3
  ↓
Lot 4
  ↓
Lot 5
  ↓
Lot 6
  ↓
Lot 7
  ↓
Lot 8
  ↓
Lot 9
```

Règles :

- pas de crawl massif avant validation du Lot 4 ;
- pas d’ingestion AkarFinder avant validation de la déduplication/lifecycle du Lot 5 ;
- pas de write production pendant les Lots 1 à 7 ;
- pas d’ingestion massive sans purge source et rollback testés ;
- pas de source supplémentaire tant que le pipeline générique n’est pas démontré avec Mubawab.

---

## 21. Definition of Done du chantier initial

Le chantier initial est CLOSED uniquement lorsqu’on possède :

- un schéma canonique versionné ;
- un adaptateur Mubawab expérimental ;
- un dataset contrôlé ;
- une preuve de normalisation correcte ;
- une preuve de déduplication ;
- une preuve de reprise après interruption ;
- une preuve de mise à jour ;
- une preuve de désactivation d’annonce disparue ;
- une preuve de purge complète d’une source ;
- une preuve que les annonces directes/partenaires restent intactes après cette purge.

Tant que ces preuves n’existent pas, le pipeline n’est pas considéré comme prêt pour une ingestion massive.

---

## 22. Décision canonique actuelle

**AkarFinder devient source-agnostic.**

Mubawab est le premier adaptateur expérimental, pas le modèle de données.

La valeur durable est le moteur d’ingestion, la normalisation, la déduplication, la fraîcheur, la provenance et la capacité à convertir progressivement les agences découvertes en relations directes avec AkarFinder.
