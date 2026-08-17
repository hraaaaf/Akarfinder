# C8 — Rabat Geometry Evidence Batch 2

## Goal

Trancher la réutilisabilité géométrique de Yacoub El Mansour après sa qualification taxonomique, sans confondre quartier produit et arrondissement administratif.

## Preuve

Le batch taxonomique C8 précédent retient une preuve AURS explicite : Yacoub El Mansour est désigné comme **quartier** dans la fiche du secteur de projet Gare d'Agdal.

En parallèle, la documentation OpenStreetMap des divisions administratives du Maroc classe Yacoub El Mansour parmi les **arrondissements** de la commune de Rabat. Cette couche administrative constitue une sémantique distincte de la `product_locality` C8.

## Verdict

La géométrie administrative de l'arrondissement n'est pas automatiquement équivalente à la géométrie du quartier produit. Sans preuve explicite d'équivalence spatiale, C8 refuse donc de promouvoir cette limite comme polygone `product_locality`.

État conservé :

- `geometry_status = unresolved` ;
- `geometry_source = null` ;
- `market_map_eligible = false` ;
- `activation_status = blocked` ;
- aucun centroïde utilisé comme contour ;
- aucun Voronoï, buffer ou contour déduit du nom ;
- aucune écriture DB ;
- aucune activation publique.

## Pourquoi ce refus est important

Une frontière administrative peut englober plusieurs quartiers ou sous-localités. La reprendre parce qu'elle porte le même nom créerait une fausse précision et mélangerait les autorités administratives et produit que C8B sépare volontairement.

## Next

Chercher soit une couche géométrique explicitement attachée au quartier produit Yacoub El Mansour, soit une preuve institutionnelle démontrant l'équivalence entre le quartier cité par l'AURS et l'arrondissement administratif. Sans cela, la géométrie reste fail-closed.
