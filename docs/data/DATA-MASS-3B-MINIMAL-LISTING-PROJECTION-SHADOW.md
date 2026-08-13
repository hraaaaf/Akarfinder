# DATA MASS-3B — Minimal Listing Projection Shadow

## Objectif

Prouver en lecture seule que le contrat MASS-3A peut être projeté sur l'inventaire réel sans contourner la Source Registry et sans transformer un seed de découverte en annonce.

## Sources de vérité

La projection lit uniquement :

- `property_listings` pour les faits déjà stockés du bien ;
- `listing_sources` pour la représentation source existante et son URL canonique ;
- `source_policy_registry` pour l'admissibilité explicite et non expirée.

`source_offer_seeds` est explicitement hors scope. Un `seed_only` n'est pas un listing et ne peut jamais être promu par ce projector.

## Projection minimale

Une représentation n'est candidate que si :

1. elle provient d'une vraie row `listing_sources` active ;
2. `property_listing_id` résout vers une vraie row `property_listings` ;
3. `listing_url` est une URL HTTP(S) valide et son hostname correspond exactement au `source_domain` de la policy ;
4. la Source Registry satisfait le contrat positif MASS-3A ;
5. un titre stocké existe, ou à défaut un `property_type` stocké sert de signal structurel fiable.

Champs optionnels préservés sans invention :

- géographie : `district`, sinon `city` ;
- prix : `price_mad` ;
- surface : `surface_m2` ;
- photo : `thumbnail_url` ;
- description : `description_snippet`.

## État attendu aujourd'hui

MASS-3A a prouvé qu'aucune row Registry n'est actuellement pleinement policy-admissible. MASS-3B doit donc produire **0 représentation projetée** sur l'inventaire réel.

Le gate est volontairement drift-safe : si une policy positive apparaît, ce lot échoue et exige un lot canary séparé au lieu d'activer automatiquement la nouvelle source.

## Non-scope

- aucune écriture `property_listings`, `listing_sources`, Registry ou autre table ;
- aucune lecture ni promotion de `source_offer_seeds` ;
- aucune activation Search ;
- aucun fetch réseau source/detail ;
- aucune permission inférée ;
- aucune correction ou enrichissement inventé ;
- aucune modification de ranking, dedup, freshness ou UI.

## Exit criteria

- tests unitaires positifs et fail-closed ;
- TypeScript + build production verts ;
- audit production read-only vert ;
- `policyAdmissibleRegistryRows = 0` ;
- `projectedRows = 0` ;
- tous les compteurs de mutation/fetch/activation à 0 ;
- artefact exact-head archivé.

La première projection non nulle appartient à un canary ultérieur, uniquement après apparition d'une source explicitement policy-admissible.
