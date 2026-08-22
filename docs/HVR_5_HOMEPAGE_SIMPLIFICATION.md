# HVR-5 — Homepage simplification

## Goal

Simplifier la deuxième moitié de la homepage pour qu’elle fonctionne comme une page d’entrée immobilière efficace : peu de sections, peu de texte, chaque bloc mène à une action réelle.

## BEFORE

HVR-4 AFTER certifié :
- run `32579508071` SUCCESS ;
- artifact `9477494308` ;
- digest `sha256:f3f1c32d3d7a7a4d9f9f5558ec7594938fc21a894d988ebafb0e2bff4d42c1f9` ;
- captures 390 / 430 / 768 / 1280 ;
- score 9,3/10.

## Problèmes ciblés

1. `Votre recherche, simplement` explique un flux déjà évident et n’offre pas d’action primaire.
2. Le bloc MRE est très volumineux et présente des valeurs d’exemple (`4 000 000 DH`, `8 biens`) qui peuvent être confondues avec de vraies données.
3. Le CTA final répète encore recherche/compagnon et allonge la page.

## Décision UX

Remplacer les trois blocs par **un seul module actionnable** après `Comprendre le quartier avant de visiter`.

### Wireframe desktop

```text
┌──────────────────────────────────────────────────────────────────────┐
│ POUR ALLER PLUS LOIN                                                 │
│ Que voulez-vous faire maintenant ?                                   │
│                                                                      │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│ │ Rechercher │ │ Mon projet │ │ Vendre     │ │ Pros       │          │
│ │ un bien →  │ │ →          │ │ mon bien → │ │ →          │          │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
└──────────────────────────────────────────────────────────────────────┘
Footer
```

### Wireframe mobile

```text
Que voulez-vous faire maintenant ?
[ Rechercher un bien             → ]
[ Préparer mon projet            → ]
[ Vendre mon bien                → ]
[ Agences & promoteurs           → ]
Footer
```

## Destinations verrouillées

- Rechercher un bien → `/search`
- Préparer mon projet → `/compagnon`
- Vendre mon bien → `/vendre`
- Agences & promoteurs → `/pro`

## Succès observable

- `HowItWorks`, `MreTrustSection` et `HomeFinalCTA` ne sont plus montés sur `/` ;
- un seul module final remplace ces trois sections ;
- 4/4 cartes ont une destination réelle ;
- aucune valeur d’exemple de budget, favoris ou compteur dans le nouveau module ;
- aucune nouvelle donnée, métrique, backend ou DB ;
- 390 / 430 / 768 / 1280 sans overflow ;
- comparaison BEFORE → wireframe → AFTER ;
- score visuel + human gate avant merge.

## Hors scope

HVR-6 benchmark final, backend, DB, ranking, ingestion, Vercel.
