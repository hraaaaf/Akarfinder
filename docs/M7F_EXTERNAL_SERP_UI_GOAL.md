# M7-F — External SERP UI Goal

Date: 2026-08-24
Status: ACTIVE

## Goal

Faire des résultats externes AkarFinder un SERP immobilier dense et lisible, sans les maquiller en annonces natives et sans afficher de contenu source non autorisé.

## BEFORE vérifié

- Production `/api/search/gateway?city=Casablanca&limit=100` : `total_count=387`, `results_count=100`, `has_more=true`.
- L’UI dispose déjà du `total_count` réel via `indexedTotalCount`.
- La section externe affichait `100 chargés`, ce qui pouvait être lu comme le total.
- Chaque résultat était une carte haute, arrondie, avec avatar de source, pills de métadonnées, disclaimer long et séparateur CTA.
- Squelettes externes : 154–166 px de haut.

## Références externes

- Mubawab affiche le volume global avant la liste, puis tri + pagination.
- Rightmove affiche également le total global, puis tri/map et une liste dense.
- Doctrine AkarFinder : conserver la logique SERP et la provenance, sans copier les détails protégés des portails.

## Wireframe cible

```text
387 résultats                                  [Vue] [Tri]

Résultats du web                 Pages indexées · source originale
┌────────────────────────────────────────────────────────────┐
│ agenz.ma                                      [badge source]│
│ Page externe indexée                                      │
│ Annonce immobilière · Appartement · Casablanca            │
│ Casablanca · Appartement · Vente                          │
│ Détails, prix, photos et disponibilité à vérifier…        │
│ agenz.ma/...                              Ouvrir la source ↗│
├────────────────────────────────────────────────────────────┤
│ 1immo.ma                                                  │
│ ...                                                       │
└────────────────────────────────────────────────────────────┘

                  [Afficher plus de résultats]
```

## Critères visuels

1. Le total global reste le nombre dominant dans la toolbar.
2. Aucun second compteur `N chargés` ne concurrence le total.
3. Les résultats externes forment une liste continue, pas une pile de grosses cards portail.
4. La source est visible avant le titre.
5. Les métadonnées minimales sont inline, sans pills volumineuses.
6. Aucun emplacement photo artificiel pour les résultats sans droit média.
7. Le CTA source reste explicite.
8. Mobile : aucune largeur fixe, texte tronqué proprement, cible principale = ligne entière.
9. Les champs protégés restent absents pour `external_minimal_index`.

## Succès

- Casablanca affiche le total réel 387 quand l’API retourne 387.
- 100 premiers résultats chargés, puis continuation via curseur.
- Liste externe visuellement plus dense.
- Tests statiques/typecheck/build verts.
- Captures AFTER 390/430/768/1280 à comparer au BEFORE.
