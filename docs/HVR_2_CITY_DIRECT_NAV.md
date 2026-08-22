# HVR-2 — Explorer le Maroc : villes en accès direct

## Goal
Réduire la friction de la homepage : une carte ville doit être une destination, pas une étape de sélection intermédiaire.

## BEFORE exact
Baseline = HVR-1 AFTER certifié :
- run `32563274184` — SUCCESS
- artifact `9473438871`
- digest `sha256:75b23d0b5848830bc922c13a473ef9857bee422a2f95a409765e6a238b0929cc`
- viewports : 390×844 / 430×932 / 768×900 / 1280×900

Comportement BEFORE vérifié dans `CityIntentGrid.tsx` :
1. cliquer une ville ne navigue pas ;
2. la ville devient « choisie » ;
3. un second panneau demande Acheter / Louer / Investir / Immobilier neuf ;
4. seulement ensuite la navigation vers Search a lieu.

## Référence visuelle / UX
- mockup homepage validé le 2026-08-22 : section « Explorer le Maroc » composée de cartes villes immédiatement lisibles et actionnables ;
- principe retenu après benchmark Zillow / Redfin / Realtor.com / Rightmove : la localisation populaire sert de raccourci vers l’inventaire, tandis que les filtres transactionnels vivent dans Search.

## Wireframe cible

```text
Explorer le Maroc                                  Voir toutes les villes →

[ Casablanca → ] [ Rabat → ] [ Marrakech → ] [ Tanger → ] [ Agadir → ] [ Fès → ]
   image              image       image          image       image       image
   courte promesse    courte      courte         courte      courte      courte

clic carte entière => /search?city=<Ville>
```

Aucun panneau « Votre projet à <ville> » sous la grille.

## Succès observable
- les 6 cartes sont des liens directs vers `/search?city=<Ville>` ;
- aucun état `selectedCity` / `selectedSlug` ;
- aucun second choix Acheter/Louer/Investir/Neuf dans cette section ;
- Search conserve ses filtres de transaction ;
- carte entière accessible clavier ;
- wording : `Explorer le Maroc` + explication courte ;
- aucun compteur d’annonces fictif ;
- 390 / 430 / 768 / 1280 : 0 overflow.

## Preuve requise
- contrat source ciblé ;
- TypeScript + build ;
- audit Playwright navigation + 4 captures AFTER ;
- comparaison BEFORE → référence → AFTER ;
- score visuel HVR-2 ;
- human visual gate avant merge.

## Hors scope
- affichage de vraies annonces : HVR-3 ;
- refonte des blocs Intelligence : HVR-4 ;
- benchmark final frais des références : HVR-6 ;
- aucun backend/DB/ranking/source/Vercel.
