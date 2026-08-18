# Carte des quartiers premium — Refonte canonique

Statut : **LOT 8 FERMÉ — LOT 9 PROCHAIN**  
Date de verrouillage : 2026-08-17  
Dernière mise à jour vérifiée : 2026-08-18  
Repo : `hraaaaf/Akarfinder`  
Branche Lot 8 : `agent/carte-quartiers-premium-lot8-rollout-multivilles`

## 1. Goal global

Transformer la page `/map` existante en **Carte intelligence marché premium AkarFinder**, sans reconstruire l’architecture déjà en place.

La carte doit :

- rester immédiatement reconnaissable comme AkarFinder ;
- devenir l’élément visuel dominant de l’expérience ;
- permettre une exploration par ville puis quartier ;
- conserver les contrats géographiques et Search existants ;
- être réutilisable pour les principales villes marocaines ;
- fonctionner desktop et mobile ;
- atteindre une qualité visuelle finale **10/10** selon le référentiel produit validé.

> Le mockup Carte intelligence marché validé fixe la direction visuelle et fonctionnelle. Il ne remplace jamais les contraintes de vérité géographique, de données ou d’accessibilité du runtime.

## 2. Décision produit verrouillée

Le tri spatial est :

**Ville -> arrondissements / quartiers -> annonces et intelligence locale.**

Villes phares initiales : Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès.

Rabat reste la ville de référence UI/UX et le seul provider d’intelligence marché dédié actuellement certifié. L’industrialisation ne doit jamais transformer une simple présence dans le registre de villes en capacité data-rich.

## 3. Base existante à réutiliser

La refonte s’appuie sur :

- `/map` ;
- `MapNeighborhoodExperience` ;
- MapLibre ;
- `canonical-neighborhood-data.ts` ;
- Geo Entity Registry ;
- contrat Search structuré `city + district` ;
- `map-navigation-state` ;
- design system Map AkarFinder ;
- panneau quartier ;
- marqueurs quartiers / clusters villes ;
- metadata de confiance ;
- couches territoriales existantes lorsqu’elles sont admissibles ;
- registre `premium-map-city-registry`.

### Interdictions

- pas de modèle géographique parallèle ;
- pas de duplication du Search contract ;
- pas de frontières inventées ;
- pas de centroïdes déguisés en polygones ;
- pas d’interpolation présentée comme donnée exacte ;
- pas de provider d’intelligence marché activé sans implémentation dédiée et preuves ;
- pas de déploiement Vercel sans autorisation explicite.

## 4. Goal visuel canonique

ADN : fond clair, blanc dominant, bleu marine + bleu électrique, bordures fines, grands arrondis, ombres légères, typographie dense, carte topographique douce, contrôles compacts et hiérarchie nette.

Le référentiel produit cible :

1. **Vue Prix** ;
2. **Vue Densité** ;
3. **Vue Volume d’annonces** ;
4. **Fiche quartier intelligence** ;
5. heatmap lisible + légende contextuelle ;
6. mobile map-first avec bloc carte quasi carré ;
7. CTA Search direct depuis le quartier.

## 5. Vérité géographique

### Si une géométrie fiable existe

- afficher le polygone ;
- conserver sa provenance ;
- appliquer le style territorial AkarFinder ;
- permettre sélection et focus.

### Sinon

- ne pas inventer de frontière ;
- conserver un repère ponctuel seulement si sa nature est explicite ;
- ou afficher le quartier sans polygonisation ;
- conserver une UI premium en fail-closed.

### État multi-villes validé après Lot 8

- Rabat : expérience data-rich dédiée ;
- Casablanca : géométrie OSM `shadow`/canary, non promue en vérité officielle ;
- Marrakech : preuves insuffisantes pour plusieurs entités ;
- Tanger, Agadir, Fès : pas de capacité d’intelligence marché dédiée équivalente à Rabat.

## 6. Contrats fonctionnels

- `city` et `district` restent structurés ;
- `q` ne remplace jamais `district` ;
- Map -> Search conserve `city + district` ;
- état URL Map reste compatible ;
- Geo Registry reste source de normalisation ;
- confiance data jamais représentée uniquement par une couleur ;
- aucun fallback ville présenté comme prix exact de quartier.

## 7. Architecture multi-villes

Le contrat commun :

- six villes phares dans `PREMIUM_MAP_CITIES` ;
- provider explicite `marketIntelligenceProvider` ;
- Rabat seul sur `rabat-market-intelligence` ;
- autres villes à `null` tant qu’un provider réel n’existe pas ;
- choix du renderer via le provider.

## 8. Roadmap d’exécution

### Lot 1 — Spec canonique Rabat ✅
### Lot 2 — Audit delta runtime ✅
### Lot 3 — Refonte desktop Rabat ✅
### Lot 4 — Refonte mobile Rabat ✅
### Lot 5 — Interactions et états ✅
### Lot 6 — Certification Rabat ✅
### Lot 7 — Industrialisation multi-villes ✅
### Lot 8 — Extension aux cinq autres villes ✅

Preuve Lot 8 :

- HEAD code certifié `5efcbc8c0105eff168d4271f6f6b749b8fd92471` ;
- Casablanca After 390/430/768/1280 : ✅ ;
- 10 captures multi-villes : ✅ ;
- Responsive / Geo / Visual Layer / a11y / UI All Pages / C7 / P0/P1/P2 : ✅ ;
- fiche compacte mobile : **216 px** ;
- score humain de structure : **9,8/10** ;
- aucune promotion de donnée non certifiée.

### Lot 9 — Trois vues marché ⏭️

Goal : rendre réels et cohérents les modes :

- Prix ;
- Densité ;
- Volume d’annonces.

Règle : chaque métrique doit provenir du stock réel ou rester fail-closed.

### Lot 10 — Heatmap + intensité + quartiers

Goal : polygones/repères, légendes contextuelles, intensités lisibles et sélection quartier, sans fausse précision.

### Lot 11 — Fiche quartier + certification finale

Goal : KPIs, tendances lorsqu’elles sont prouvées, confiance/source, CTA Search, 390/430/768/1280, six villes et comparaison finale au référentiel **10/10**.

## 9. Scoring

Lot 8 structure premium multi-villes : **9,8/10 validé**.

La note **10/10** reste réservée à la cible complète après Lots 9 à 11. Elle ne doit pas être déclarée avant preuve finale.

## 10. Prochaine étape exacte

**Lot 9 : implémenter les trois vues Prix / Densité / Volume d’annonces avec données réelles, légendes cohérentes et comportement fail-closed.**

Principe directeur : **réutiliser ce qui est fiable, ne promouvoir aucune donnée non certifiée, et préférer un fail-closed propre à une carte séduisante qui raconte des bêtises.**
