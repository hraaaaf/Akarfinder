# C8 — Rabat Geometry Evidence Batch 3

## Goal

Qualifier la valeur géométrique de la preuve AURS utilisée pour Douar Doum, El Kora et El Garaa, sans transformer une preuve de sémantique urbaine en contour spatial.

## Preuve actuelle

La page institutionnelle AURS `Aire urbaine de Rabat` qualifie explicitement `Douars Doum`, `El Kora` et `El Garaa` de quartiers informels ou précaires formés dans la capitale.

Cette source est suffisamment explicite pour la taxonomie produit, mais la page ne fournit pas de polygone numérique, de couche SIG ou de description complète de frontière directement réutilisable pour ces trois localités.

## Verdict

Pour les trois localités : `geometry_unresolved_taxonomy_source_not_spatial`.

Ce verdict signifie uniquement que **la source taxonomique actuellement certifiée n'est pas une preuve géométrique suffisante**. Il ne prétend pas qu'aucune géométrie n'existe dans une autre source ou un autre jeu de données.

## Garde-fous

- aucun point ou centroïde promu comme polygone ;
- aucun buffer, Voronoï ou contour déduit du nom ;
- aucune frontière administrative substituée sans preuve d'équivalence sémantique ;
- aucune écriture DB ;
- aucune activation publique.

## Next

Chercher une couche ou un document spatial explicitement rattaché à chacune des trois `product_locality`. Sans cette preuve, elles restent fail-closed côté géométrie.
