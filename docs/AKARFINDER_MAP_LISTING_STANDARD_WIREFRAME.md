# AkarFinder — Map + Listing Standard — Wireframe N0

Date : 2026-08-19
Statut : **REFERENCE FONCTIONNELLE N0 — avant implémentation**

Ce wireframe fixe la composition et les états. Il ne fixe pas encore les micro-détails graphiques ni une copie de Zillow. Le langage visuel reste AkarFinder.

## Goal visuel

Créer une expérience continue où :

- la carte reste dominante ;
- les filtres et résultats vivent dans le même workspace ;
- l’intelligence territoriale apparaît avant/avec les biens, jamais à leur place ;
- une sélection quartier ou bien ne provoque pas de rupture mentale de navigation ;
- mobile garde la carte visible et utilise une sheet progressive ;
- la fiche Listing conserve sa profondeur mais réduit la longueur perçue et garde un retour exact à la recherche.

## Desktop — état D0 : exploration / aucun bien sélectionné

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ AkarFinder   Acheter  Louer  Neuf  Agences  Conseils      Favoris  Publier │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ Ville, quartier, résidence…              ] [Acheter] [Prix] [Type] [•••] │
├───────────────────────────────────────┬──────────────────────────────────────┤
│                                       │  247 biens · Maârif                 │
│                                       │  [Recommandé ▾]                     │
│             CARTE                     │                                      │
│                                       │  ┌──────────┐ ┌──────────┐          │
│  ville → quartiers → marché           │  │ résultat │ │ résultat │          │
│                                       │  │ compact  │ │ compact  │          │
│  métrique active au bon zoom          │  └──────────┘ └──────────┘          │
│                                       │                                      │
│  [Prix] [Densité] [Annonces]          │  Intelligence de la zone           │
│                                       │  prix / confiance / stock           │
│        Rechercher dans cette zone     │                                      │
└───────────────────────────────────────┴──────────────────────────────────────┘
```

### Critères D0

- aucun footer dans le viewport de travail ;
- carte et résultats simultanément visibles à 1280 ;
- la colonne résultats scroll indépendamment si nécessaire ;
- carte manipulable sans perdre les filtres ;
- intelligence quartier compacte, pas de panneau géant ;
- aucune donnée marché si preuve insuffisante.

## Desktop — état D1 : quartier sélectionné

```text
┌───────────────────────────────────────┬──────────────────────────────────────┐
│ CARTE                                 │ Maârif                              │
│                                       │ Confiance · échantillon             │
│ [quartier sélectionné]                │ Prix / Densité / Annonces           │
│                                       │                                      │
│ pins/clusters apparaissent selon zoom │ 247 biens dans cette zone           │
│                                       │ [cards synchronisées avec la carte] │
│ [Rechercher dans cette zone]          │                                      │
└───────────────────────────────────────┴──────────────────────────────────────┘
```

### Critères D1

- le quartier reste lisible derrière/avec l’inventaire ;
- le marché et les biens sont distingués visuellement ;
- CTA Search ne quitte plus nécessairement le workspace : il actualise l’inventaire du scope courant ;
- `city + district + transaction + filtres` restent canoniques.

## Desktop — état D2 : bien sélectionné

```text
┌───────────────────────────────────────┬──────────────────────────────────────┐
│ CARTE                                 │ ← 247 biens                         │
│                                       │ ┌──────────────────────────────────┐ │
│                [PIN ACTIF]            │ │ photo / prix / titre / confiance│ │
│                                       │ │ quartier / surface / chambres   │ │
│ autres pins atténués                  │ │ [Voir le bien] [Favori]         │ │
│                                       │ └──────────────────────────────────┘ │
│                                       │ Résultats voisins                  │
└───────────────────────────────────────┴──────────────────────────────────────┘
```

### Critères D2

- card sélectionnée ↔ pin sélectionné = même identité canonique ;
- hover desktop peut prévisualiser sans mutation d’URL lourde ;
- clic ouvre Listing en conservant un `return/search state` exact ;
- précision du pin respecte `geo_precision`.

## Mobile — état M0 : map-first

```text
┌──────────────────────────────┐
│ ☰       AkarFinder       ♙   │
├──────────────────────────────┤
│ [zone/recherche           ]  │
│ [Acheter] [Prix] [Type] →   │
├──────────────────────────────┤
│                              │
│                              │
│            CARTE             │
│                              │
│ ville/quartier/market/pins   │
│                              │
│   Rechercher dans cette zone │
│                              │
├──────────────────────────────┤
│ ── 247 biens · Maârif ──     │  ← sheet collapsed
├──────────────────────────────┤
│ Explorer Favoris Carte Alertes Compte │
└──────────────────────────────┘
```

### Critères M0

- carte = majorité visible du viewport ;
- contrôles essentiels accessibles sans masquer la carte ;
- bottom-nav clearance mesurée ;
- sheet collapsed ≤ environ 30 % du viewport, sauf nécessité prouvée.

## Mobile — état M1 : preview

```text
┌──────────────────────────────┐
│            CARTE             │
│          [PIN ACTIF]         │
│                              │
├──────────────────────────────┤
│ ─────── drag handle ───────  │
│ 2 350 000 DH                 │
│ Appartement · Maârif         │
│ 138 m² · 3 ch. · confiance   │
│ [Voir le bien]   [Favori]    │
├──────────────────────────────┤
│ Explorer Favoris Carte Alertes Compte │
└──────────────────────────────┘
```

### Critères M1

- la carte reste visible derrière le preview ;
- aucune card plein écran au premier tap ;
- swipe horizontal peut passer au bien voisin sans perdre la zone ;
- tap `Voir le bien` conserve le retour exact.

## Mobile — état M2 : résultats expanded

```text
┌──────────────────────────────┐
│ bande carte résiduelle       │
├──────────────────────────────┤
│ 247 biens · Maârif      ⌄    │
│ ┌──────────────────────────┐ │
│ │ résultat compact         │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ résultat compact         │ │
│ └──────────────────────────┘ │
│ ... scroll                  │
├──────────────────────────────┤
│ Explorer Favoris Carte Alertes Compte │
└──────────────────────────────┘
```

### Critères M2

- sheet scrollable indépendamment ;
- la carte n’est jamais détruite/recréée juste pour changer la hauteur de sheet ;
- fermeture/repli restaure le même viewport cartographique ;
- tri et filtres restent disponibles.

## Listing — cible de hiérarchie

```text
Hero bien + actions
↓
Confiance / provenance / informations essentielles
↓
Marché & position du prix + mini-carte / retour zone
↓
Mon Projet / décision
↓
Détails techniques regroupés et navigables
↓
Vie locale / environnement / coûts / historique
↓
Provenance détaillée
```

### Critères Listing

- conserver la profondeur existante ;
- réduire le scroll perçu par regroupement/navigation, pas par suppression arbitraire ;
- marché et carte utilisent les mêmes contrats que le workspace ;
- retour Search/Map restauré exactement ;
- mobile : sections essentielles avant détails secondaires ;
- aucun sticky dock ne masque le contenu ou la bottom-nav.

## Publisher onboarding — cible fonctionnelle

```text
Rôle / provenance
      ↓
Type + transaction + segment
      ↓
Localisation + précision
      ↓
Prix + surfaces + agencement
      ↓
Caractéristiques conditionnelles
      ↓
Photos / plans + droits média
      ↓
Identité/contact/permissions selon rôle
      ↓
Validation complétude / qualité
      ↓
Preview Listing Standard
      ↓
Publication uniquement si guards satisfaits
```

Owner, agence et promoteur partagent le **même noyau property schema**. Les différences sont des obligations/provenances/permissions, pas trois modèles de bien.

## Référence de comparaison

BEFORE exact-head :

- Final UI artifact `9371334718` ;
- Carte C7 artifact `9366976831` ;
- Listing L17 artifact `9321690793`.

La future référence haute fidélité devra rester conforme à ce wireframe avant toute implémentation N3.

## Interdictions

- aucune valeur illustrative du wireframe ne devient une donnée runtime ;
- aucune géométrie inventée ;
- aucune précision pin supérieure à la preuve ;
- aucune fusion Vente/Location ;
- aucun déploiement Vercel sans autorisation explicite.
