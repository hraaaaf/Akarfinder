# Carte des quartiers premium — Refonte canonique

Statut : **LOT 1 — SPEC CANONIQUE EN COURS**  
Date de verrouillage : 2026-08-17  
Repo : `hraaaaf/Akarfinder`  
Branche de travail : `agent/carte-quartiers-premium-lot1-spec`

## 1. Goal global

Transformer la page `/map` existante en **Carte des quartiers premium AkarFinder**, sans reconstruire l’architecture déjà en place.

La carte doit :

- rester immédiatement reconnaissable comme AkarFinder ;
- devenir l’élément visuel dominant de l’expérience ;
- permettre une exploration par ville puis quartier ;
- conserver les contrats géographiques et Search existants ;
- être réutilisable pour les principales villes marocaines ;
- fonctionner desktop et mobile ;
- viser une qualité visuelle **>= 9,8/10** avant fermeture du chantier UI.

> Le mockup Rabat validé par le produit fixe la **direction visuelle**. Il ne remplace jamais les contraintes de vérité géographique, de données ou d’accessibilité du runtime.

## 2. Décision produit verrouillée

Le premier tri spatial de la nouvelle carte est :

**Ville -> arrondissements / quartiers -> annonces et intelligence locale.**

Villes phares initiales :

1. Casablanca
2. Rabat
3. Marrakech
4. Tanger
5. Agadir
6. Fès

Rabat sert de **ville de référence UI/UX pour la première implémentation**, car le mockup canonique de la refonte a été validé sur Rabat.

L’industrialisation multi-villes vient après validation de Rabat.

## 3. Base existante à réutiliser — ne pas repartir de zéro

La refonte doit s’appuyer sur l’existant :

- `/map` ;
- `MapNeighborhoodExperience` ;
- MapLibre ;
- `canonical-neighborhood-data.ts` ;
- Geo Entity Registry ;
- contrat Search structuré `city + district` ;
- `map-navigation-state` ;
- design system Map déjà convergé vers l’identité bleue AkarFinder ;
- panneau quartier flottant existant ;
- marqueurs quartiers / clusters villes ;
- mode prix et metadata de confiance existants ;
- `akarfinder-territorial-style` et couches territoriales existantes lorsqu’elles sont autoritatives.

### Interdictions

- pas de modèle géographique parallèle ;
- pas de duplication du Search contract ;
- pas de retour au seed brut lorsqu’un adaptateur canonique existe ;
- pas de frontières inventées ;
- pas de centroïdes déguisés en polygones ;
- pas d’interpolation présentée comme donnée exacte ;
- pas de déploiement Vercel sans autorisation explicite du propriétaire du projet.

## 4. Goal visuel canonique

### ADN AkarFinder à conserver

- fond très clair ;
- blanc dominant ;
- bleu marine + bleu électrique ;
- bordures fines ;
- grands arrondis ;
- ombres légères et contrôlées ;
- typographie dense, premium, peu décorative ;
- hiérarchie nette ;
- mobile avec bottom navigation ;
- carte claire et topographie douce ;
- contrôles en capsules blanches ;
- pas de surcharge décorative.

### Amélioration exigée par rapport au premier mockup

Le premier mockup a été évalué **9,6/10**. Les corrections retenues comme référence de refonte sont :

1. rendre la carte plus dominante ;
2. réduire le bruit périphérique d’environ 10–15 % ;
3. alléger la sidebar verticale desktop ;
4. alléger le sélecteur des villes ;
5. rendre les couleurs des quartiers plus sophistiquées et moins « maquette conceptuelle » ;
6. renforcer la relation visuelle entre quartier sélectionné et fiche de bien ;
7. compacter les insights secondaires ;
8. conserver une stricte cohérence desktop/mobile.

Le mockup V2 issu de ces corrections a été **validé comme direction produit**. Le score >= 9,8 reste une **gate de certification à mesurer sur l’implémentation réelle**, pas une note inventée.

## 5. Référence UI — desktop Rabat

### Structure générale

1. Header AkarFinder existant / cohérent avec le reste du produit.
2. Sélecteur compact des six villes, avec Rabat actif.
3. Barre de recherche compacte.
4. Filtres en capsules :
   - Budget
   - Type
   - Surface
   - Chambres
   - Filtres
5. Carte occupant la majorité du viewport utile.
6. Contrôles géographiques minimalistes.
7. Quartier sélectionné clairement identifiable.
8. Fiche immobilière / décision locale reliée visuellement au quartier actif.
9. Insights secondaires compacts en dessous ou en overlay léger selon viewport.

### Quartiers de référence visuelle Rabat

Le mockup utilise notamment :

- Hay Riad
- Agdal
- Souissi
- Hassan
- Océan
- Yacoub El Mansour
- Rabat Centre

**Important :** cette liste est une référence UI. L’affichage d’un polygone réel dépend d’une géométrie autoritative disponible dans les sources canoniques.

### États visuels obligatoires

- ville active ;
- quartier disponible non sélectionné ;
- quartier sélectionné ;
- quartier sans géométrie polygonale autoritative ;
- faible couverture data ;
- aucune donnée ;
- loading ;
- erreur ;
- hover desktop ;
- focus clavier ;
- sélection au clic / clavier ;
- mode prix lorsque les données sont admissibles.

## 6. Référence UI — mobile Rabat

La version mobile n’est pas une réduction paresseuse du desktop.

Elle doit conserver :

- header compact ;
- recherche compacte ;
- filtres essentiels ;
- carte prioritaire ;
- quartier actif clairement visible ;
- bottom sheet / fiche bien compacte ;
- bottom navigation AkarFinder ;
- action de fermeture / retour accessible ;
- zones tactiles suffisantes ;
- aucun panneau desktop simplement empilé hors écran.

## 7. Vérité géographique — règle fail-closed

La refonte visuelle ne doit jamais contourner les règles Geo existantes.

### Si une géométrie fiable existe

- afficher le polygone ;
- identifier la source/provenance si le contrat courant le prévoit ;
- appliquer le style territorial AkarFinder ;
- permettre sélection et focus.

### Si aucune géométrie fiable n’existe

- **ne pas inventer de frontière** ;
- conserver un repère ponctuel / marker uniquement si sa nature est explicitement correcte ;
- ou afficher le quartier dans la liste / recherche sans polygonisation ;
- l’UI doit rester élégante même en mode fail-closed.

### Rabat

Au moment de ce verrouillage, la géométrie polygonale autoritative de plusieurs quartiers de Rabat reste un sujet ouvert dans le chantier Carte Intelligence Marché. La refonte doit donc être conçue pour fonctionner sans fabriquer ces contours.

## 8. Contrats fonctionnels à préserver

- `city` et `district` restent des dimensions structurées ;
- `q` ne remplace jamais `district` ;
- navigation Map -> Search conserve `city + district` ;
- état URL Map existant doit rester compatible ;
- un changement purement visuel ne doit pas casser Geo Registry ;
- la confiance data ne doit pas être représentée uniquement par une couleur ;
- aucun fallback ville ne doit être présenté comme un prix exact de quartier.

## 9. Composants cible

Réutiliser avant de créer :

- Map shell existant ;
- MapLibre instance / lifecycle ;
- markers ;
- district panel ;
- Search handoff ;
- Geo resolution ;
- theme tokens ;
- map visual tokens.

Créer / refactorer seulement si nécessaire :

- `CitySelector` compact six villes ;
- `MapFilterBar` premium ;
- `NeighborhoodTerritoryLayer` ou adaptateur équivalent autour des couches existantes ;
- `NeighborhoodSelectionCard` plus visuelle ;
- `NeighborhoodInsightsStrip` compact ;
- mobile bottom sheet adapté.

Les noms ci-dessus sont **des rôles de composants**, pas une obligation de créer exactement ces fichiers si l’existant couvre déjà le besoin.

## 10. Roadmap d’exécution

### Lot 1 — Spec canonique Rabat

Goal : verrouiller cette refonte et les règles d’acceptation avant code UI.  
Succès : ce document existe, décrit la direction validée et ne contredit pas les contrats runtime existants.  
Preuve : revue du fichier + cohérence avec `/map`, Geo Registry et Search existants.

### Lot 2 — Audit delta runtime

Comparer écran réel `/map` vs cible validée :

- desktop ;
- mobile ;
- structure ;
- composants réutilisables ;
- éléments à retirer ;
- éléments à ajouter ;
- contraintes de géométrie réelles.

### Lot 3 — Refonte desktop Rabat

Implémenter le delta minimal sans réécrire le moteur Map.

### Lot 4 — Refonte mobile Rabat

Adapter l’expérience à la navigation tactile et au bottom sheet.

### Lot 5 — Interactions et états

- ville ;
- quartier ;
- fiche ;
- filtres ;
- URL ;
- Search handoff ;
- empty / loading / fail-closed.

### Lot 6 — Certification Rabat

- mêmes viewports avant / après ;
- comparaison baseline / mockup / après ;
- responsive ;
- a11y ;
- tests Geo/Search/Map ;
- build ;
- scoring visuel explicite.

Gate : **>= 9,8/10** pour fermer la partie visuelle.

### Lot 7 — Industrialisation multi-villes

Extraire uniquement ce qui est réellement commun après Rabat validé.

### Lot 8 — Extension aux cinq autres villes

Ordre recommandé :

1. Casablanca
2. Marrakech
3. Tanger
4. Agadir
5. Fès

Chaque ville reste soumise aux mêmes règles de géométrie autoritative et de fail-closed.

## 11. Grille de scoring visuel

La note finale doit être justifiée, pas déclarative.

Axes :

- cohérence AkarFinder ;
- hiérarchie visuelle ;
- dominance et lisibilité de la carte ;
- ergonomie recherche / filtres ;
- qualité des états quartier ;
- cohérence fiche <-> sélection géographique ;
- desktop ;
- mobile ;
- densité d’information ;
- finition premium ;
- accessibilité visuelle ;
- absence de bruit inutile.

Seuil de fermeture : **9,8/10 minimum**.

## 12. Prochaine étape exacte

**Lot 2 : auditer le runtime `/map` actuel et produire le diff minimal entre l’existant et cette cible canonique.**

Le principe directeur est simple : **réutiliser tout ce qui est déjà fiable, ne changer que ce qui rapproche réellement le produit du Goal, et ne jamais sacrifier la vérité géographique pour obtenir une jolie carte.**
