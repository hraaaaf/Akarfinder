# Carte intelligence marché — C3 closeout

Date : 2026-08-16
Statut : **CLOSED**
Lot suivant : **C4 — Heat map interactive conforme au mockup**

## Résultat

C3 livre une API GeoJSON read-only de market intelligence pour le pilote Rabat, avec trois modes `price`, `density`, `listings`, séparés en `sale` / `rent`.

Endpoint :
`/api/geo/rabat-market-intelligence?mode=<price|density|listings>&transaction=<sale|rent>`

## Contrats verrouillés

- market zones Canary revues, toujours explicitement non officielles ;
- lecture live bornée depuis tables de base ;
- résolution Geo latest-event-first ;
- dédup URL canonique ;
- médiane Prix/m² et Reliability P1C.2 ;
- valeurs Price insuffisantes neutres ;
- densité calculée depuis les aires C1 certifiées ;
- seuils de couleur `snapshot_quantiles_v1` calculés depuis le snapshot ;
- légende et remplissage reproductibles depuis le même calcul ;
- invalid params / géométrie non publiable / métriques indisponibles restent fail-closed ;
- aucun chiffre illustratif du mockup comme seuil runtime.

## Preuves

- PR : #698
- merge : `bd8ffc2b28e70c4d44adfa6ecca9b6269bc35450`
- exact head : `a980c829ff37239c9a39c1927682453dcdcc3e35`
- C3 gate : `31920864146` — SUCCESS
- C1C compatibility gate : `31920864126` — SUCCESS
- artefact live : `9256321998`
- artefact digest : `sha256:fe5a1dcc2de3ab17022fc2933b9cccb39724c38a0f4c62559a31b560adb438c0`
- tests : SUCCESS
- TypeScript : SUCCESS
- live bounded Rabat proof : SUCCESS
- production build : SUCCESS

## Limites conservées

La couverture Prix reste faible sur le pilote Rabat. C3 ne convertit jamais cette faiblesse en fausse précision : les segments `insufficient` restent neutres. Le payload est un produit d'observations AkarFinder actuelles, pas une certification de représentativité nationale.

## Handoff C4

C4 doit consommer l'API C3 dans la Carte réelle et certifier :
- tabs `Prix / Densité / Annonces` ;
- polygones interactifs ;
- légende visible ;
- états neutres ;
- sélection de zone ;
- CTA Search filtré ;
- comportement mobile/desktop ;
- interaction MapLibre réelle, pas seulement un test statique.
