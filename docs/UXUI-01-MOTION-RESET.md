# UXUI-01 — Motion Reset

## Objectif
Réduire le mouvement décoratif afin de rendre AkarFinder plus calme, plus lisible et plus premium, sans toucher aux comportements fonctionnels.

## Doctrine
- Le mouvement doit expliquer un état, pas décorer l’espace.
- Une animation dominante maximum par viewport.
- Préserver les animations fonctionnelles : chargement, feedback d’action, états interactifs.
- Supprimer ou réduire les animations perpétuelles, les reveals systématiques et les translations décoratives.
- Respecter `prefers-reduced-motion`.

## Scope P0
1. Supprimer les reveals systématiques de sections sur la homepage.
2. Arrêter le marquee automatique du Market Pulse et le remplacer par un scroll horizontal manuel.
3. Réduire les micro-mouvements décoratifs des cartes villes : pas de translation verticale, zoom image très léger seulement.
4. Conserver loaders, feedbacks et interactions utiles.

## Hors scope
- Hero copy / architecture de contenu.
- Refonte des visuels Appartement / Villa.
- Refonte SERP.
- Refonte globale du design system.

## Definition of Done
- Aucun contenu important ne dépend d’un reveal pour apparaître.
- Aucun bandeau de contenu ne défile automatiquement.
- Les cartes de villes ne se déplacent plus verticalement au hover.
- Les interactions restent immédiatement compréhensibles.
- Le diff reste limité au motion system.
