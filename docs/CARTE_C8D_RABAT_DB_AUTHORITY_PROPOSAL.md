# C8D — Proposition d'autorité DB Rabat

## Statut

**Proposal-only / read-only.** Ce lot ne contient aucun SQL d'écriture et n'autorise aucune mutation production.

Le but est de transformer la preuve Shadow en un contrat de données précis, vérifiable avant le futur human gate DB.

## Contrainte DB vérifiée

`geo_entities` accepte `validated | pending_review | rejected`. L'unicité est garantie sur l'ID et sur `(entity_type, parent_id, slug)`.

`geo_aliases` garantit seulement l'unicité `(geo_entity_id, normalized_alias)`. **La DB n'interdit pas qu'un même `normalized_alias` de confiance 1 pointe vers deux entités différentes.** Un futur write gate devra donc recontrôler explicitement toute collision inter-entités avant mutation.

Aucun des quatre IDs/slugs proposés n'existe actuellement et aucun alias normalisé proposé ne collisionne aujourd'hui avec un alias `confidence=1` existant.

## Proposition Tier A

### Yacoub El Mansour

- futur ID proposé : `district_rabat_yacoub_el_mansour` ;
- parent : `city_rabat` ;
- état initial : `pending_review`, `seo_eligible=false`, `map_eligible=false` ;
- aliases proposés : `Yacoub El Mansour`, `Yaacoub El Mansour` ;
- 19 `property_listings` structurées ;
- 7 matchs Shadow uniques / 3 sources ;
- 0 ambiguïté Shadow observée ;
- 1 seed bridgé, sans événement geo.

### Medina

- futur ID proposé : `district_rabat_medina` ;
- parent : `city_rabat` ;
- état initial fail-closed ;
- **une seule ligne d'alias DB** `Medina → medina` : `Médina` normalise au même token et serait redondante ;
- 12 `property_listings` structurées ;
- 6 matchs Shadow uniques / 2 sources ;
- 0 ambiguïté Shadow observée ;
- 1 seed bridgé, sans événement geo.

### Aviation

- futur ID proposé : `district_rabat_aviation` ;
- parent : `city_rabat` ;
- état initial fail-closed ;
- 23 `property_listings` structurées ;
- 6 matchs Shadow uniques / 2 sources ;
- 2 seeds bridgés, sans événement geo ;
- 4 documents Agenz sont ambigus `Aviation ↔ Mabella` : **ils doivent rester non résolus en free text**. L'autorité structurée `district = Aviation` ne doit pas convertir ces ambiguïtés en vérité.

## Proposition Tier B

### Akkari

- futur ID proposé : `district_rabat_akkari` ;
- 5 `property_listings` structurées ;
- contexte first-party AURS ;
- seulement 1 match Shadow unique et 1 source observée ;
- recommandation : préparer l'autorité mais **ne pas la promouvoir** sans seconde preuve ou échantillon manuel suffisant.

## Impact borné

Les quatre noms représentent ensemble :

- 59 `property_listings` structurées ;
- 4 seeds bridgés ;
- 4/4 bridgés sans événement geo ;
- 0 résolution existante contradictoire sur ces bridges ;
- 20 matchs Shadow uniques ;
- 0 écriture production dans ce lot.

## Règle de future mutation

Une future mutation devra être un lot séparé avec human gate explicite. Avant toute écriture :

1. exact-head CI verte ;
2. recheck ID/slug ;
3. recheck collision globale des aliases normalisés `confidence=1` ;
4. décision taxonomique candidate → certifiée séparée ;
5. comptage frais du cohort impacté ;
6. création initiale strictement fail-closed (`pending_review`, SEO off, map off) ;
7. aucune écriture de `geo_resolution_events` dans le même geste ;
8. vérification post-write avant tout passage `validated`.

## Non-objectifs

Pas de géométrie, pas de métriques C3, pas de Search/ranking, pas d'API publique, pas d'UI et aucune activation de quartier.
