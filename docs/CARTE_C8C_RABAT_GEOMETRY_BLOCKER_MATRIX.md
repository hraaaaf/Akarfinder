# C8C — Rabat Geometry Blocker Matrix

## Goal

Classer exactement les **19/23** localités C8C encore sans géométrie certifiée avant toute nouvelle dérivation. Ce lot n'invente aucun contour et n'active aucune zone.

## État vérifié du registre

Le registre C8B contient 23 localités produit/candidates. C8C certifie déjà 4 géométries analytiques : Agdal, Hay Riad, Hassan et Souissi.

Parmi les 19 restantes :

- **1** est déjà `taxonomy_status=certified` mais sans géométrie : **Océan** (`district_rabat_ocean`) ;
- **18** sont encore `taxonomy_status=candidate` et restent donc bloquées avant certification géométrique par le contrat C8C.

Le binding C8C exige explicitement `taxonomy_status=certified`. Attacher un polygone certifié à l'une des 18 candidates contournerait donc le gate actuel.

## Océan — preuve disponible et limite

Océan est déjà une localité certifiée dans C8B et une entité Rabat validée dans l'autorité production existante. La source first-party AURS traite explicitement **Océan** et **Akkari** comme deux quartiers de Rabat dans son programme de rénovation urbaine, et publie une présentation dédiée « Quartiers Akkari-Océan ».

Cette preuve défend l'existence et le nom de la localité, **pas une frontière de quartier directement réutilisable**. La donnée OSM publiquement indexée pour Océan est un `place=suburb` ponctuel, pas une relation polygonale de quartier. En conséquence, C8C conserve Océan `geometry_unresolved` au lieu de dériver un contour depuis un centroïde, un Voronoï ou une simple occurrence nominale.

Sources consultées pour ce gate :

- AURS, « Rénovation urbaine des quartiers Océan et Akkari — Arrondissement Hassan, Ville de Rabat » ;
- AURS, « Présentation Quartiers Akkari-Océan » ;
- OpenStreetMap, signal `place=suburb` d'Océan (objet ponctuel), utilisé uniquement pour constater l'absence de polygone de quartier directement réutilisable dans cette piste.

## Les 18 candidates

Les 18 autres unresolved restent dans la proposition d'autorité C8D en `pending_review`, non SEO et non map-eligible. Plusieurs disposent de preuves first-party de nom/contexte ou d'un `admin_parent`, mais cela ne transforme pas automatiquement une limite d'arrondissement en limite de `product_locality`.

Le prochain travail utile est donc de **certifier d'abord la taxonomie des candidates dont l'identité produit est source-backed**, puis seulement d'évaluer une géométrie analytique défendable pour celles qui passent ce gate. Les cas où `product_locality` et unité administrative portent le même nom doivent rester explicitement distingués jusqu'à validation de l'équivalence sémantique recherchée.

## Invariants

- géométries certifiées C8C : **4/23** ;
- unresolved : **19/23** ;
- nouvelles activations publiques : **0** ;
- mutations DB : **0** ;
- aucun centroïde transformé en polygone ;
- aucun Voronoï ajouté ;
- aucune frontière officielle revendiquée.

## Next exact

1. audit taxonomy source-backed des 18 candidates ;
2. promouvoir seulement les localités dont l'identité produit est défendable, sans activation publique ;
3. reprendre ensuite la géométrie sur ce sous-ensemble certifié ;
4. laisser Océan fail-closed tant qu'aucun contour analytique source-backed et reproductible n'est disponible.
