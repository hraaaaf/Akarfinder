# External SERP UX — Option B target

## Goal

Afficher les pages immobilières externes comme un SERP compact, source-first et multi-source, sans faire croire qu'AkarFinder héberge ou possède l'annonce.

## Success

- 15 résultats logiques visibles au chargement initial ;
- pagination visuelle par lots de 15 ;
- regroupement uniquement lorsque le moteur de similarité existant passe son seuil **et** qu'au moins deux domaines sources différents sont présents ;
- formulation prudente : « pages semblent concerner le même bien » ;
- détail des pages sources accessible à la demande ;
- aucun titre/snippet/prix/photo source présenté par la carte externe minimale ;
- aucun faux total de « biens distincts » : le total global reste un total de pages/résultats indexés tant que le backend ne certifie pas un total dédupliqué ;
- 390 / 430 / 768 / 1280 sans overflow horizontal ni erreur navigateur critique.

## Visual target

Canonical wireframe: `docs/EXTERNAL_SERP_B_TARGET.svg`.

Hierarchy:

1. total indexé réel ;
2. résultat logique compact ;
3. métadonnées normalisées minimales ;
4. domaines sources visibles ;
5. indication de similarité prudente si multi-source ;
6. expansion des pages sources ;
7. « Afficher 15 suivants ».

## Safety

AkarFinder reste un index et renvoie vers l'URL originale. Le regroupement est une aide de lecture, pas une affirmation de doublon confirmé.
