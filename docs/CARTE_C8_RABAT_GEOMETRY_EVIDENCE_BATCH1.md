# C8 — Rabat Geometry Evidence Batch 1

## Goal

Tester si les deux premières localités promouvables taxonomiquement, Akkari et Al Boustane, disposent déjà d'une preuve spatiale suffisante pour créer une géométrie C8C certifiable.

## Succès

Le lot est réussi si chaque localité reçoit un verdict explicite et sourcé, sans fabrication de contour, sans activation publique et sans écriture production.

## Akkari

L'AURS confirme Akkari comme quartier de Rabat dans le programme de rénovation Océan–Akkari et publie une présentation dédiée. Les pages first-party revues ne fournissent cependant pas de polygone de quartier directement réutilisable ni de description complète permettant de reconstruire une limite sans inférence.

**Verdict : `geometry_unresolved`.**

## Al Boustane

L'AURS décrit Al Boustane comme un nouveau quartier de Rabat de 270 ha, situé dans le prolongement de Hay Ryad et Souissi, délimité au nord par la rocade urbaine n°3, à l'ouest et au sud par la ceinture verte et à l'est par des propriétés privées.

Cette description est une preuve spatiale forte, mais la limite orientale n'est pas matérialisée par un objet numérique réutilisable et la page ne fournit pas de polygone complet. Transformer ce texte en contour serait une dérivation non certifiée.

**Verdict : `geometry_unresolved`.**

## Guardrails

- aucun centroïde n'est promu en géométrie exacte ;
- aucun Voronoï additionnel ;
- aucun contour déduit d'un nom ;
- aucune conversion automatique de prose en polygone ;
- aucun changement `market_map_eligible` ;
- `productionWriteCount=0`.

## Résultat

Ce batch n'augmente volontairement pas la couverture géométrique. C8C reste à **4/23** tant qu'un artefact spatial suffisamment défendable n'est pas acquis.

## Next

Chercher une restitution numérique, couche SIG, document cartographique géoréférençable ou géométrie source-backed plus précise pour Akkari, Al Boustane et Océan. Tant qu'elle n'existe pas, conserver `unresolved`.