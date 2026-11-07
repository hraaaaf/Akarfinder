# Vivre Ici — L2 : cible UX carte + fiche intelligente (pré-implémentation)

**07/11/2026 · Statut : proposition de référence UX, non implémentée / non certifiée · Onboarding 6/6 validé.** Ce document ne change aucun composant. Il sert de **mockup fonctionnel textuel / cible** préalable à une refonte UI. Les captures réelles sont les références BEFORE ; la spec pilote Maârif validée dans Notion en reste la référence sémantique pour L3.

## 1. GOAL / SUCCESS / PROOF

**GOAL.** Faire de Vivre Ici un outil d'aide à choisir où habiter pour acheteurs/locataires : **carte dominante + fiche intelligente** apportant d'abord de la vie quotidienne, puis du cadre de vie et enfin Search, du Maroc entier à Maârif, sans chiffres ou contours inventés.

**SUCCESS.** Une personne identifie sa zone, choisit un quartier, comprend ce qui y est **réellement disponible et documenté**, puis passe vers Search. Carte encore visible après ouverture de la fiche, controls effectifs, sources compréhensibles, aucun élément hors écran, aucun faux polygone/onglet. Au mobile, fiche compacte ≤160px **cible de design** lorsqu'elle est repliée, CTA tactile ≥44px.

**PROOF.** Captures BEFORE [L0 workflow #98](https://github.com/hraaaaf/Akarfinder/actions/runs/42320980541), artifact #13553704238 (national, zoom, Maârif à **390×844, 430×932, 768×900, 1280×900**). Captures de drilldown et Maârif APRÈS correction L1 [P1A.6 #42358643944](https://github.com/hraaaaf/Akarfinder/actions/runs/42358643944), artifact #13568826936 : **20 PNG, 0 finding technique**, mais ne valident **pas** le design final. Comparaison cible→AFTER dans un navigateur exact HEAD après implémentation, même fixtures, tests d'accessibilité et de source. **Pas de note visuelle à ce stade.**

## 2. Décisions de conception — arbitrages découlant des six choix utilisateur

| Élément | GARDER | CHANGER / SUPPRIMER | CONDITION |
| --- | --- | --- | --- |
| Carte nationale | TopoJSON régions réelles, repères villes sourcés, navigation en niveaux | Densité/centrage/légendes sur 390/430, grande zone vide ; éviter microtypographies | Pas de manipulation qui déforme la géographie |
| Ville choisie | Point-ville sourcé + liste de quartiers côté fiche | **Supprimer `neighborhoodPolygon(index)` qui dessine des contours SVG arbitraires** ; aucune nouvelle limite non certifiée | Liste sans géométrie si centres non documentés |
| Fiche intelligence | `P4MapDecisionRail` et statut `NeighborhoodContextReadModelV1` | Une fiche claire « Quotidien → Cadre de vie → Biens » ; garder ses données `covered/partial/insufficient/unavailable` | Aucun score ni temps de trajet sans provider réel |
| Mobile | Carte haute + CTA Search existant | Vraie **bottom sheet repliable** avec bouton/état `aria-expanded`, contenu scrolable, retour visuel ; supprimer poignée uniquement décorative | Ne pas masquer CTA ni carte, gestes non obligatoires |
| Modes cartes Maârif | Moteur MapLibre et ressources sourcées | **Retirer les faux toggles 2D/3D** ou les rendre effectivement interactifs en L3 ; corriger zoom caché si commande utile | Toute limite admin n'apparaît qu'avec source SIG revue |
| Repères de quotidien | Lecture POI source/licence/date, catégories | Quand `anchor_count=0`, message utilisateur explicite sans cartes vides ; préparer rafraîchissement officiel | TTL 30 jours maintenu, ne pas ressusciter la seed août |
| Search | CTA visible avec ville/quartier sélectionnés | Un CTA cohérent ; ne pas intégrer une deuxième page d'annonces | Retour zone/état stable |

## 3. Wireframe fonctionnel — desktop 1280

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ AkarFinder                                       Explorer · Vivre ici    │
├──────────────────────────────────────────┬────────────────────────────────┤
│ CARTE DOMINANTE (~65%)                   │ FICHE (~35%)                  │
│ Maroc / ville / Maârif                   │ Casablanca / Maârif          │
│                                          │                               │
│ Navigation réellement sourcée,           │ Vie quotidienne              │
│ repères réels, légende et attribution     │ Écoles · santé · commerces    │
│                                          │ Transports · disponibilité    │
│ [Catégories POI si données suffisantes]  │                               │
│                                          │ Cadre de vie                 │
│                                          │ Parcs · services · sources    │
│                                          │                               │
│                                          │ Biens                         │
│                                          │ [Voir les biens à Maârif]     │
├──────────────────────────────────────────┴────────────────────────────────┤
│ Données indisponibles clairement signalées ; source/dernier relevé       │
└───────────────────────────────────────────────────────────────────────────┘
```

Au niveau **ville sans contour certifié** : la carte conserve les repères région/ville sourcés et affiche uniquement une sélection ponctuelle/honnête ; **liste des quartiers dans la fiche**. Pas de faux polygones attribués à un quartier. Le CTA Search reste ancré au niveau quartier, et un retour à la ville/région est disponible.

## 4. Wireframe fonctionnel — mobile 390 / 430

```text
┌────────────────────────────────┐
│ Header / retour Maroc          │
│                                │
│                                │
│       CARTE MAJORITAIRE        │
│       repères réels uniquement │
│       zoom + recentrage        │
│                                │
├────────────────────────────────┤
│ Maârif, Casablanca       [˄]   │  ← bouton vrai, aria-expanded
│ Repères récents indisponibles  │
│ [Voir les biens à Maârif]      │  ← ≥44px
└────────────────────────────────┘
```

**État ouvert :** `Maârif / Quotidien / Cadre de vie / Biens / Sources` en fiche scrollable, carte **toujours visible** ; geste/drag optionnel mais bouton utilisable au clavier, lecteur d'écran et doigt. État fermé cible **≤160px**, y compris la navigation fixe ; sur écrans bas ne jamais dissimuler CTA ni masquer l'attribution. La hauteur de fiche est vérifiée à **390×844, 430×932, 768×900, 1280×900** par mesure de `boundingClientRect`.

## 5. Implémentation prévue en lots atomiques

1. **L2-A — Carte honnête** : retirer le rendu `neighborhoodPolygon(index)` et son header trompeur ; maintenir une carte nationale/ville vérifiée et une liste accessible de quartiers. Conserver le point ville sourcé; pas de nouveau contour. Tests parcours et captures des quatre viewports **avant/après** ; photographier l'ancien schéma à la même étape et montrer la différence.
2. **L2-B — Fiche** : nettoyer l'architecture : Vie quotidienne en premier, Cadre de vie ensuite, CTA Search final, sources et état de couverture ; les catégories vides ont un message simple, pas de 0 « vérifiés » ou score imaginaire.
3. **L2-C — Bottom sheet mobile** : remplacer la poignée décorative par bouton, vraie ouverture/fermeture et focus, mesures hauteur compacte et expanded, CTA visible et taille tactile. Vérifier que les overrides CSS existants ne cachent pas les textes (cause du bug corrigé L1).
4. **L2-D — Contrôles et crédits** : zoom/recentrage, modes affichés et attribution/légende ; les modes vraiment cartographiques Maârif et limite admin relèvent de **L3**.

## 6. Gates spécifiques et frontières

- **BEFORE** : sur la branche candidate L1, screenshots de sélection nationale Maârif (4 viewports) [#42358643944](https://github.com/hraaaaf/Akarfinder/actions/runs/42358643944), source actuelle `PremiumInteractiveMap` ; pour le national et Maârif initial, [run #98](https://github.com/hraaaaf/Akarfinder/actions/runs/42320980541) est le BEFORE strict main. Ne jamais prétendre qu'il contient l'écran ville/quartier sélectionné (il ne l'a pas photographié).
- **AFTER** : mêmes étapes, tailles, lumières/thèmes, source POI, et captures ; contrôler clipping vertical, overflow horizontal, focus clavier, retour Maroc, taille des commandes, attributs `aria-`, lisibilité 11–14px min **cible design**, ne pas afficher de zones fictives.
- **Données & droits** : vérifier l'attribution effective OSM/OpenFreeMap/Esri ; `attributionControl:false` dans MapLibre ne dispense pas du respect des licences. Source frontière Maârif `shadow/reviewed:false` = non publiable sans revue SIG. Les géométries d'arrondissements ≠ quartiers.
- **Architecture** : rester sur `/map`, garder les deux moteurs par échelle, ne pas reconstruire Search. Aucun transfert en DB ni écriture dans Vercel.
- **CI** : réel required `gate` ; N3, P1A.6, P1B.1 et autres suites pertinentes ; investiguer les échecs de harness obsolète Zillow (première page désormais premium SVG), et l'incident externe prix 503/Supabase séparément.
- **Human gates** : changement de direction visuelle stratégique ou promotion d'une géométrie/source nécessitent revue; **merge GitHub** et **déploiement Vercel** nécessitent des autorisations spécifiques et distinctes, absentes du simple « Go » pour L0.

**État : cible L2 préparée, aucun changement UI de L2 encore exécuté ; premier lot implémentable L2-A dès que l'on a un HEAD candidat cohérent sans fusion non autorisée.**
