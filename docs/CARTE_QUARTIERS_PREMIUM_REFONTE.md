# Carte des quartiers premium — Refonte canonique

Statut : **LOT 8 — EXTENSION MULTI-VILLES EN CERTIFICATION**  
Date de verrouillage : 2026-08-17  
Dernière mise à jour vérifiée : 2026-08-18  
Repo : `hraaaaf/Akarfinder`  
Branche de travail : `agent/carte-quartiers-premium-lot8-rollout-multivilles`

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

Rabat reste la ville de référence UI/UX et le seul provider d’intelligence marché dédié actuellement certifié. L’industrialisation ne doit jamais transformer une simple présence dans le registre de villes en capacité data-rich.

## 3. Base existante à réutiliser — ne pas repartir de zéro

La refonte s’appuie sur :

- `/map` ;
- `MapNeighborhoodExperience` ;
- MapLibre ;
- `canonical-neighborhood-data.ts` ;
- Geo Entity Registry ;
- contrat Search structuré `city + district` ;
- `map-navigation-state` ;
- design system Map convergé vers l’identité bleue AkarFinder ;
- panneau quartier flottant ;
- marqueurs quartiers / clusters villes ;
- mode prix et metadata de confiance ;
- `akarfinder-territorial-style` et couches territoriales existantes lorsqu’elles sont admissibles ;
- registre `premium-map-city-registry` issu du Lot 7.

### Interdictions

- pas de modèle géographique parallèle ;
- pas de duplication du Search contract ;
- pas de retour au seed brut lorsqu’un adaptateur canonique existe ;
- pas de frontières inventées ;
- pas de centroïdes déguisés en polygones ;
- pas d’interpolation présentée comme donnée exacte ;
- pas de provider d’intelligence marché activé sans implémentation dédiée et preuves ;
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

### Référence validée

Le mockup V2 Rabat reste la référence de direction : carte dominante, bruit périphérique réduit, sélecteur de villes compact, couleurs territoriales sobres, relation forte entre sélection géographique et fiche, cohérence desktop/mobile.

Le score >= 9,8/10 reste une gate de certification mesurée sur l’implémentation réelle.

## 5. Référence UI — desktop

Structure cible :

1. Header AkarFinder cohérent avec le reste du produit.
2. Sélecteur compact des six villes.
3. Recherche compacte.
4. Filtres essentiels.
5. Carte occupant la majorité du viewport utile.
6. Contrôles géographiques minimalistes.
7. Quartier sélectionné clairement identifiable.
8. Fiche reliée visuellement au territoire ou au repère actif.
9. Insights secondaires compacts.

États obligatoires : ville active, quartier disponible, quartier sélectionné, géométrie indisponible, faible couverture, aucune donnée, loading, erreur, hover, focus clavier, sélection, mode prix uniquement lorsque les données sont admissibles.

## 6. Référence UI — mobile

La version mobile doit conserver :

- header compact ;
- recherche compacte ;
- filtres essentiels ;
- carte prioritaire ;
- quartier actif clairement visible ;
- bottom sheet / fiche compacte ;
- bottom navigation AkarFinder ;
- fermeture / retour accessible ;
- zones tactiles suffisantes ;
- une seule couche d’overlay primaire lorsqu’une fiche quartier est ouverte.

## 7. Vérité géographique — règle fail-closed

### Si une géométrie fiable existe

- afficher le polygone ;
- conserver sa provenance ;
- appliquer le style territorial AkarFinder ;
- permettre sélection et focus.

### Si aucune géométrie fiable n’existe

- ne pas inventer de frontière ;
- conserver un repère ponctuel seulement si sa nature est explicite ;
- ou afficher le quartier sans polygonisation ;
- conserver une UI élégante en fail-closed.

### État actuel multi-villes

- Rabat : expérience data-rich dédiée certifiée lors des Lots 3 à 6 ;
- Casablanca : géométrie OSM existante mais `shadow`/canary, non promue en vérité officielle ;
- Marrakech : preuves insuffisantes pour plusieurs entités géographiques ciblées ;
- Tanger, Agadir, Fès : aucune capacité d’intelligence marché dédiée équivalente à Rabat n’est actuellement activée.

## 8. Contrats fonctionnels à préserver

- `city` et `district` restent des dimensions structurées ;
- `q` ne remplace jamais `district` ;
- navigation Map -> Search conserve `city + district` ;
- état URL Map reste compatible ;
- Geo Registry reste source de normalisation ;
- la confiance data ne doit pas être représentée uniquement par une couleur ;
- aucun fallback ville ne doit être présenté comme un prix exact de quartier.

## 9. Architecture multi-villes

Le Lot 7 a extrait le contrat commun suivant :

- six villes phares dans `PREMIUM_MAP_CITIES` ;
- provider explicite `marketIntelligenceProvider` ;
- Rabat seul sur `rabat-market-intelligence` ;
- les autres villes à `null` tant qu’un provider réel n’existe pas ;
- `MapNeighborhoodClient` choisit le renderer via le provider, pas via une égalité de ville fragile.

Cette architecture empêche qu’une future activation de ville rende accidentellement le composant Rabat ailleurs.

## 10. Roadmap d’exécution

### Lot 1 — Spec canonique Rabat ✅
Spec verrouillée et mergée.

### Lot 2 — Audit delta runtime ✅
Audit runtime/cible verrouillé et mergé.

### Lot 3 — Refonte desktop Rabat ✅
Implémentation et certification visuelle desktop mergées.

### Lot 4 — Refonte mobile Rabat ✅
Implémentation mobile et correction des overlays mergées.

### Lot 5 — Interactions et états ✅
Navigation, Search handoff, loading/fail-closed et interactions certifiés puis mergés.

### Lot 6 — Certification Rabat ✅
Certification finale Rabat mergée, score visuel vérifié 9,8/10.

### Lot 7 — Industrialisation multi-villes ✅
Registre de capacités/provider et routing commun extraits puis mergés.

### Lot 8 — Extension aux cinq autres villes ⏳

Ordre : Casablanca, Marrakech, Tanger, Agadir, Fès.

État vérifié :

- audit readiness en place ;
- Casablanca reste générique avec couche territoriale shadow/canary uniquement ;
- les cinq villes conservent `city + district` vers Search ;
- correction UI mobile/tablette appliquée pour éviter l’empilement fiche + contrôles + explorer + légende ;
- baseline Casablanca before archivée sur 390×844, 430×932, 768×900, 1280×900 ;
- captures after durcies pour attendre le rendu réel MapLibre ;
- certification exact-head encore requise avant fermeture et merge.

## 11. Grille de scoring visuel

Axes : cohérence AkarFinder, hiérarchie, dominance carte, ergonomie recherche/filtres, états quartier, relation fiche/sélection, desktop, mobile, densité, finition premium, accessibilité visuelle, absence de bruit inutile.

Seuil de fermeture : **9,8/10 minimum**.

## 12. Prochaine étape exacte

**Lot 8 : terminer la certification exact-head, inspecter les captures after réellement rendues, scorer le résultat, corriger toute régression, puis merger uniquement si toutes les gates pertinentes sont vertes.**

Principe directeur : **réutiliser ce qui est fiable, ne promouvoir aucune donnée non certifiée, et préférer un fail-closed propre à une carte très jolie qui raconte des bêtises.**
