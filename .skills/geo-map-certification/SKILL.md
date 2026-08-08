# Geo & Map Certification

## Purpose
Préserver une géographie canonique unique et empêcher toute précision spatiale supérieure aux preuves disponibles.

## When it applies
Geo Registry, city/district/neighborhood, aliases, canonicalisation, MapLibre, géométrie, coordonnées, couches territoriales ou navigation Search↔Map.

## Required inspection
Geo Registry et aliases, contrats city/district, données de géométrie et leur statut shadow/canary/published, provenance/licence, URL state, Search contract, carte et fallbacks.

## Mandatory evidence
Résolution canonique ; absence de second modèle ; fail-closed pour entités inconnues ; provenance/licence géométrie ; tests Geo exact-head ; screenshots si rendu ; continuité Search/Map si touchée.

## Blockers
Polygone/coordonnée/proximité inventé ; ville présentée comme quartier ; alias divergent ; géométrie shadow promue sans contrat ; interpolation pour remplir la carte ; `q` utilisé comme substitut de filtre géographique.

## PASS / FAIL criteria
PASS si toute précision visible correspond à une entité/provenance autorisée et les contrats Geo restent uniques et testés. Sinon `CHANGES_REQUIRED`.

## Forbidden shortcuts
Pas de dessin approximatif de quartier ; pas de propagation d'une métrique ville aux polygones ; pas de second registry client ; pas de score territorial sans dénominateur exact.

## Required final report
SHA, entités/contrats touchés, provenance géométrie, tests/gates, états fail-closed, findings et verdict.
