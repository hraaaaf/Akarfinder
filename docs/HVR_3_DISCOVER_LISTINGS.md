# HVR-3 — Biens à découvrir

## Goal

Faire apparaître de vrais biens très tôt sur la homepage, immédiatement après `Explorer le Maroc`, dans un module compact et actionnable inspiré de la simplicité de Rightmove, sans prétendre qu'ils sont « récents », « recommandés » ou éditorialement sélectionnés si l'ordre réel ne le prouve pas.

## BEFORE

Baseline = AFTER HVR-2 certifié :
- run `32568589072` — SUCCESS ;
- artifact `9474791842` ;
- digest `sha256:8b7ee6df252175209bdc40a72cb729b46bdbcd3054a07e944102b9625c14fab7` ;
- viewports 390 / 430 / 768 / 1280.

## Référence UX

Direction retenue :
- Rightmove pour la simplicité et la priorité donnée aux actions ;
- mockup AkarFinder validé pour l'idée de montrer des biens tôt ;
- les cartes doivent rester AkarFinder, truth-safe et compatibles avec la politique image/source existante.

## Wording verrouillé

Titre : **Biens à découvrir**

Sous-titre : **Quelques biens actuellement visibles dans AkarFinder.**

Interdit dans ce lot :
- `Biens récents` ;
- `Nouveautés` ;
- `Recommandés pour vous` ;
- tout compteur ou signal de fraîcheur non démontré.

## Wireframe

Desktop :

```text
Biens à découvrir                                      Voir tous les biens →
Quelques biens actuellement visibles dans AkarFinder.

[ photo/fallback ] [ photo/fallback ] [ photo/fallback ] [ photo/fallback ]
[ prix           ] [ prix           ] [ prix           ] [ prix           ]
[ type · surface ] [ type · surface ] [ type · surface ] [ type · surface ]
[ quartier, ville] [ quartier, ville] [ quartier, ville] [ quartier, ville]
```

Mobile :

```text
Biens à découvrir                         Voir tout →
Quelques biens actuellement visibles...

[ carte 1              ][amorce carte 2]
< horizontal scroll / snap >
```

## Données / vérité

- source runtime : `searchListings()` / moteur public existant ;
- aucune importation de `mockListings` ni de données statiques de démonstration ;
- ordre laissé à la logique publique actuelle ; le wording ne lui attribue donc aucune notion de récence ;
- maximum 4 cartes visibles dans le module ;
- `can_show_result=false` et `production_allowed=false` restent exclus ;
- prix absent = wording existant `Prix non communique`, jamais `0 DH` ;
- image réelle seulement si la politique existante autorise `real_image` ou `preview_image` ;
- sinon fallback `PropertyTypeArtwork` clairement présenté comme illustration ;
- pas de réhébergement ou de nouveau droit image introduit par HVR-3.

## Interaction

- carte interne → `/listings/<id>` ;
- résultat externe nécessitant la source originale → `listing_url` ;
- CTA section → `/search`.

## Succès

1. HVR-3 est placé après `Explorer le Maroc` et avant l'intelligence quartier.
2. 1 à 4 vraies représentations publiques sont rendues depuis le moteur existant lorsque des données sont disponibles.
3. Aucun mock ni prix/compteur inventé.
4. Politique images existante respectée.
5. Chaque carte mène vers une destination réelle.
6. 390 / 430 / 768 / 1280 : 0 overflow et module lisible.
7. TypeScript + build + source contracts + audit Playwright verts.
8. AFTER mêmes viewports → score → human visual gate avant merge.

## Hors scope

- changement de ranking ou tri ;
- mutation DB / ingestion / source ;
- reconstruction de la section quartier (HVR-4) ;
- simplification globale de la homepage (HVR-5) ;
- benchmark final externe (HVR-6) ;
- Vercel.
