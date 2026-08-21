# AkarFinder Product Experience — Couleurs territoriales par ville

Date : 2026-08-21
Base : `main@842238669d08ea5efe190071b6a6b5af20e03b00`
Statut : **PREPARED — AFTER / HUMAN GATE FINAL À CERTIFIER**

## Goal

Au zoom Maroc, rendre les six villes phares immédiatement différenciables par une identité couleur stable sans fabriquer de frontière géographique. Au zoom ville, préserver les couches quartier existantes.

## BEFORE

Capture dédiée du code non modifié :

- branche de preuve isolée : `agent/product-experience-city-colors-before` ;
- PR de preuve : `#834` — ne doit pas être mergée ;
- run : `32468774958` — SUCCESS ;
- artifact : `9441749487` ;
- route : `/map?layer=explore` ;
- 390×844 / 430×932 / 768×900 / 1280×900 ;
- 4/4 captures ;
- 0 finding ;
- 8 marqueurs ville existants : Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès, Kénitra, Mohammedia ;
- aucune identité couleur ville active dans le BEFORE.

## Mockup

Référence visuelle préparée avant implémentation sur les quatre viewports exacts.

Contrat visuel :

- Casablanca : bleu `#2563EB` ;
- Rabat : teal `#0F766E` ;
- Marrakech : terracotta `#C2410C` ;
- Tanger : violet `#7C3AED` ;
- Agadir : vert `#15803D` ;
- Fès : framboise `#BE123C` ;
- halos doux autour des marqueurs ville ;
- mêmes couleurs sur les chips de navigation ville ;
- Kénitra et Mohammedia restent neutres ;
- couleur = identité de repérage uniquement, jamais prix, qualité, demande ou frontière.

## Décision truth-safe

Le repo ne contient pas de géométrie administrative nationale certifiée pour les six villes phares. Le lot n'ajoute donc aucun polygone, aucune limite simulée et aucune géométrie inventée. Il colore uniquement les repères ville déjà positionnés par le moteur cartographique.

## Succès

1. six couleurs stables et distinctes sur les villes phares au zoom Maroc ;
2. halos cartographiques liés aux marqueurs ville existants ;
3. chips de navigation utilisant la même identité couleur ;
4. Kénitra et Mohammedia restent neutres ;
5. contrat `identity-only` exposé au runtime ;
6. aucune source GeoJSON, aucun polygon/fill ajouté par ce lot ;
7. les couleurs disparaissent en entrant dans une ville ;
8. la couche territoriale Casablanca reste active ;
9. MapLibre réel, exact-white, logo canonique et absence d'overflow préservés ;
10. 8/8 captures AFTER, 0 finding ;
11. P4 territorial et P2 navigation restent verts ;
12. aucun Vercel.

## Preuve requise

Workflow `Product Experience City Colors` : contrat truth-safe, régressions P4/P2, TypeScript, build production, Chromium, 4 viewports nationaux + 4 viewports Casablanca, 8 captures, 0 finding.

Après run vert : inspection BEFORE → mockup → AFTER, score UX/UI, puis human gate final explicite avant merge.
