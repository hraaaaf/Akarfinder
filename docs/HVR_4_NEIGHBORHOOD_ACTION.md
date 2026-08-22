# HVR-4 — Intelligence quartier actionnable

## BEFORE

Baseline = HVR-3 AFTER certifié, run `32578052976`, artifact `9477075713`, 390 / 430 / 768 / 1280.

La section actuelle `SignatureMapSection` est haute, sombre et démonstrative. Elle contient une carte stylisée, des tabs, plusieurs blocs d'information et un CTA situé tard dans le module. Le message `Un bien ne se résume pas à ses mètres carrés.` est juste sur le fond mais trop passif sur la homepage.

## Goal

Transformer cette zone en module court et immédiatement actionnable : comprendre un quartier puis l'ouvrir en un clic.

## Succès

- titre fonctionnel `Comprendre le quartier avant de visiter` ;
- trois quartiers réels issus de `canonical-neighborhood-data` : Agdal, Maârif, Guéliz ;
- chaque carte entière mène vers sa page quartier ;
- aucun état sélectionné intermédiaire ;
- maximum 2 repères de proximité + 3 tags de style de vie + 1 repère prix par carte ;
- aucun `bientôt disponible`, étoiles désactivées ou promesse non actionnable ;
- section nettement plus courte que le BEFORE ;
- responsive 390 / 430 / 768 / 1280, 0 overflow ;
- aucune donnée inventée.

## Référence d'architecture

Direction validée : simplicité Rightmove pour la homepage, profondeur fonctionnelle conservée dans les pages quartier. Le benchmark frais complet Zillow / Redfin / Realtor.com / Rightmove reste réservé à HVR-6.

## Wireframe

```text
Comprendre le quartier avant de visiter
Les repères utiles, puis la page complète si le quartier vous intéresse.

[ RABAT · AGDAL             → ]
[ repère 1 ] [ repère 2 ]
[ tag ] [ tag ] [ tag ]
Repère prix: ...
Explorer Agdal

[ CASABLANCA · MAÂRIF       → ]
...

[ MARRAKECH · GUÉLIZ        → ]
...
```

Desktop : 3 cartes sur une ligne.
Tablet : grille 2 + 1.
Mobile : carousel horizontal avec carte suivante partiellement visible.

## Hors scope

Aucun backend, DB, ranking, ingestion, nouvelle métrique, Vercel ou benchmark final.
