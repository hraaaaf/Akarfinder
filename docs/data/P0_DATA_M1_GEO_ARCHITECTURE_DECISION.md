# P0 DATA — Mission 1 — Décision d’architecture géographique

**Statut :** GO_M1_ARCHITECTURE_APPROVED  
**Branche :** `agent/p0-data-m1-geography`  
**Référence :** juillet 2026  
**Issue :** #94

## 1. Décision

La Mission 1 doit **faire évoluer** le registre existant `lib/geo/geo-entity-registry.ts` vers un référentiel persistant et versionné. Elle ne doit pas créer un second système d’identité géographique concurrent.

Le registre TypeScript actuel reste le contrat de compatibilité des consommateurs Search, Map et SEO pendant la migration. La base Supabase devient progressivement la source de vérité, avec un adaptateur de lecture conservant les interfaces publiques existantes.

## 2. État existant constaté

Le repo possède déjà un registre canonique V1 :

- identités de villes ;
- identités de quartiers ;
- alias contextualisés par ville ;
- normalisation accents/apostrophes ;
- résolution ville + quartier ;
- règles séparées `seo_eligible` et `map_eligible` ;
- consommateurs Search, Map et SEO déjà branchés via des adaptateurs canoniques.

Ce capital doit être conservé.

## 3. Limites du V1 à corriger

1. Hiérarchie limitée à ville/quartier.
2. Absence de région, préfecture/province, commune, arrondissement/district et microzone.
3. Identifiants de quartiers préfixés `district_`, alors que district et quartier sont des niveaux différents.
4. Noms arabes et translittérations typées absents.
5. Géométries, provenance et confiance de géométrie absentes.
6. Statuts de publication insuffisamment détaillés.
7. Alias stockés dans des tableaux, sans provenance, confiance ni audit.
8. Couverture quartier limitée.
9. Risques de confusion territoriale : Bouskoura ville/commune vs zone commerciale d’usage ; routes entières assimilées à un quartier ; sous-zones d’Agdal et Bourgogne non modélisées.
10. Pas de backfill persistant et auditable des valeurs brutes vers les références canoniques.

## 4. Modèle cible retenu

### 4.1 Table unifiée d’entités

Créer une table additive `geo_entities` plutôt que des tables parallèles par niveau.

Champs minimaux :

- `id uuid` ;
- `entity_type` : country, region, province_prefecture, city, commune, district, neighborhood, microzone ;
- `parent_id` ;
- `country_code` ;
- `canonical_name_fr` ;
- `canonical_name_ar` ;
- `canonical_name_latin` ;
- `slug` ;
- `latitude`, `longitude` ;
- `centroid` et `geometry` lorsque PostGIS est disponible ;
- `geometry_source` ;
- `geometry_confidence` ;
- `validation_status` ;
- `publication_status` ;
- `seo_eligible`, `map_eligible` ;
- `is_active` ;
- timestamps.

Contraintes :

- unicité `(parent_id, entity_type, slug)` ;
- aucune unicité nationale du nom seul ;
- parenté validée selon le type ;
- géométrie approximative jamais présentée comme officielle.

### 4.2 Alias normalisés

Créer `geo_aliases` :

- `geo_entity_id` ;
- `alias` ;
- `normalized_alias` ;
- `language` ;
- `transliteration_type` ;
- `city_context_id` ;
- `source` ;
- `confidence` ;
- `is_preferred` ;
- timestamps.

Contrainte principale : unicité contextualisée, jamais fusion automatique sur `normalized_alias` seul.

### 4.3 Relations et géométries

Créer uniquement si le schéma existant ne fournit pas un équivalent propre :

- `geo_relationships` pour relations non strictement parentales ;
- `geo_boundaries` si les géométries nécessitent provenance/version multiples.

Ne pas dupliquer les colonnes PostGIS et une table de boundaries sans besoin démontré.

## 5. Compatibilité

Le V1 TypeScript ne sera pas supprimé pendant M1.

Séquence :

1. migration additive ;
2. seed idempotent depuis le V1 et l’Annexe A ;
3. service DB de résolution ;
4. adaptateur conservant les signatures `resolveCityEntity`, `resolveNeighborhoodEntity`, `canonicalizeGeoPair`, variantes Search et filtres SEO/Map ;
5. comparaison V1/DB ;
6. activation progressive par feature flag si le repo utilise déjà ce mécanisme ;
7. retrait du seed TypeScript uniquement dans une mission ultérieure explicitement validée.

## 6. Données brutes et backfill

Les textes source doivent rester intacts.

Le backfill ajoute des références canoniques séparées, sans écraser :

- `raw_city` ;
- `raw_district` ;
- `raw_neighborhood` ;
- ou leurs champs existants équivalents.

Le script doit fournir :

- `--dry-run` par défaut ;
- `--apply` explicite ;
- lots bornés ;
- journal d’exécution ;
- motifs `resolved`, `ambiguous`, `unresolved`, `context_mismatch` ;
- idempotence ;
- rollback par identifiant d’exécution ou migration inverse documentée.

## 7. Seed P0-A

Le seed initial importe :

- toutes les villes déjà présentes dans le registre V1 ;
- les villes réellement observées dans les données, après rapport de volumes ;
- les quartiers et alias de l’Annexe A avec statut `seeded_research` / interne ;
- aucune géométrie inventée ;
- aucun prix public.

Les entités ambiguës restent `pending_review` et non éligibles SEO/publication.

## 8. Invariants de résolution

- Agdal Rabat ≠ Agdal Marrakech.
- Une mauvaise ville doit empêcher la résolution du quartier.
- Arabe, français et translittération sont supportés.
- Les routes nécessitent une sous-zone, distance ou PK lorsque disponible.
- Une résidence portant le nom d’un quartier n’est pas automatiquement un quartier.
- Une commune périurbaine ne doit pas être aplatie en quartier de la métropole.
- Une valeur inconnue est conservée brute et marquée non résolue.

## 9. Tests requis avant certification

- accents, apostrophes, tirets ;
- arabe et translittération ;
- homonymes inter-villes ;
- erreur de contexte ville ;
- unicité des slugs contextualisés ;
- parentés autorisées/interdites ;
- seed et backfill rejoués deux fois ;
- rollback ;
- parité V1/DB sur les entités existantes ;
- Search, Map et SEO inchangés ;
- RLS ;
- migration sur base éphémère ;
- TypeScript, tests et build complets.

## 10. Gate

**GO_M1 confirmé**, avec la condition suivante : aucune migration de production et aucune activation publique avant :

- inventaire final du schéma Supabase ;
- validation locale de la migration ;
- rapport de collisions ;
- dry-run du backfill ;
- CI verte ;
- certification M1 explicite.
