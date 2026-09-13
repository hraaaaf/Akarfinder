# AKARFINDER — P3 SEARCH STANDARD V1 — AUDIT

**Date:** 2026-09-13  
**Statut:** AUDIT / NON LOCKED  
**Base:** `main@cc748ec5eb24f422216cb1261e4c01977e7f25d0`

## Goal

Définir le standard durable de `/search` avant tout nouveau polish, sans rouvrir P1 HOME ni P2 IA.

### Succès observable

- structure runtime réelle de `/search` inventoriée ;
- dettes/ambiguïtés UX séparées des invariants solides ;
- benchmark international recoupé ;
- proposition P3 explicite prête à être soumise au propriétaire ;
- aucune décision P3 promue L0 avant accord explicite.

### Preuve attendue

Code `main` + captures BEFORE 390/768/1280 + benchmark externe + tests responsive + accord propriétaire sur le périmètre exact.

---

## 1. Runtime actuel vérifié

### Page `/search`

`app/search/page.tsx` :

- route dynamique (`force-dynamic`) ;
- canonical `/search`, `robots.index=false`, `follow=true` ;
- 24 résultats/page ;
- initial search server-side ;
- `SiteHeader searchMode` ;
- `SearchMapNavigationBridge` ;
- `SearchPersonalizationControl` ;
- `PropertySelectionProvider` + compare + quick preview ;
- `LightZillowSearchShell` ;
- `SearchPriceExplorerDock` ;
- `FinderLauncher` ;
- footer search.

La page est donc déjà un **moteur de résultats multi-outils**, pas un simple listing.

### Shell principal

`LightZillowSearchShell` porte :

- filtres + URL canonique de session ;
- tri ;
- pagination ;
- vues `split/list/map` ;
- résultats internes ;
- résultats indexés gateway ;
- carte ;
- personnalisation Mon Projet ;
- compare ;
- continuité retour listing/search/map.

### Filtres

`QuickFilters` contient :

- recherche texte dominante ;
- chips rapides `Tous / À vendre / À louer / Prix / Filtres` ;
- panneau avancé desktop ;
- bottom-sheet mobile ;
- transaction, ville, budget min/max, surface min, type de bien ;
- sélecteur visuel du type de bien.

---

## 2. Points solides à préserver comme candidats P3

> **Candidats seulement. Pas L0 avant validation propriétaire.**

1. `/search` reste le moteur universel P2, pas un nouveau pilier primaire.
2. Recherche + filtres restent immédiatement accessibles au-dessus des résultats.
3. Les filtres importants sont reflétés dans l’URL pour partage/retour/navigation.
4. Le résultat conserve une continuité liste ↔ détail ↔ carte.
5. La carte est un mode de consultation du même état de recherche, pas une recherche parallèle divergente.
6. Mobile utilise un sheet de filtres dédié plutôt qu’un formulaire desktop compressé.
7. Les cartes gardent accès à la source/provenance et aux mécanismes de comparaison existants.

---

## 3. Dettes / risques trouvés dans le code

### A. Contrôle de vue mobile probablement invisible — priorité haute

`SearchViewSwitcher.tsx` donne au `<select data-search-mobile-view-select>` les classes `hidden sm:hidden`.

Au niveau du code Tailwind, cela le masque à toutes les tailles. Le switcher desktop est lui-même `hidden ... sm:flex`.

**Risque :** aucun contrôle visible `liste / split / carte` sous `sm`, alors que le shell démarre en `split`.

**Statut :** anomalie code-level forte, à confirmer par capture BEFORE 390 avant correction.

### B. Compteur de filtres incomplet

`QuickFilters.activeCount` compte ville, budgets, surface et type de bien, mais pas notamment la transaction active. D’autres états existent dans `ListingFiltersState` (`mreOnly`, reliability/package score dans le shell) sans présence claire dans le compteur/chips courant.

**Risque :** l’utilisateur peut avoir une recherche réellement filtrée sans feedback équivalent dans le badge de filtres.

### C. État URL incomplet selon les filtres runtime

`buildBrowserSearchUrl` persiste q/city/district/transaction/property type/budget/surface/sort/page/project, mais certains états runtime ne sont pas persistés dans cette fonction.

**Risque :** partage/back/refresh pouvant ne pas reproduire exactement un état avancé si ces filtres sont activables ailleurs.

### D. Deux lanes de résultats à clarifier

Le shell utilise simultanément :

- `/api/search` pour `listings` ;
- `/api/search/gateway` pour `gatewayResults` sur la page 1.

`totalResultCount` prend le maximum de plusieurs compteurs et le rendu juxtapose les deux familles.

**Risque à vérifier :** sémantique du total, overlap cross-lane et perception d’une seule liste continue.

Aucune conclusion de doublon réel n’est déclarée sans test de données.

### E. Bridge carte/détail par MutationObserver

`SearchMapNavigationBridge` réécrit les `href` de tous les liens `/map` et `/listings/` trouvés dans le DOM via `MutationObserver`.

**Avantage :** continuité centralisée aujourd’hui.  
**Dette :** couplage implicite et global, fragile face à de nouveaux composants/liens.

À conserver fonctionnellement en P3, mais l’implémentation peut rester L1 tant que le contrat de continuité est testé.

### F. Empilement CSS historique

`app/search/page.tsx` importe actuellement plusieurs feuilles de polish spécialisées (`search-density`, `search-controls-10of10`, premium card/grid/density, convergence L2, P4 map shell, property-type visuals/target art...).

**Risque :** la page possède plusieurs générations de standards visuels superposés. P3 doit figer un contrat visible unique avant tout nouveau polish.

### G. Densité fonctionnelle élevée

Compare dock + quick preview + personalization + price explorer + FinderLauncher + map + gateway + tri + filtres vivent sur la même surface.

**Risque UX :** valeur forte, mais priorité visuelle potentiellement diluée. P3 doit distinguer :

- couche primaire : chercher / filtrer / lire / comparer / carte ;
- couche secondaire : personnalisation, price explorer, Mon Projet ;
- utilitaires contextuels : quick preview, compare dock.

---

## 4. Benchmark international recoupé

### Redfin

Référence : recherche par ville/quartier/ZIP, résultats centrés sur la carte, zoom dynamique, dessin de zone, filtres au-dessus des résultats et sauvegarde de recherche.

**Leçon pour AkarFinder :** état recherche + carte doivent rester une seule expérience continue.

### Rightmove

Référence : recherche initiale simple, filtre tray sur la page de résultats, tri près du premier résultat, bascule map/list, filtres avancés regroupés.

**Leçon :** ne pas afficher tous les filtres en permanence ; garder les critères essentiels visibles et le reste dans un panneau clair.

### idealista

Référence 2026 : sélection de plusieurs zones depuis home/listing/map, ajout/retrait immédiat, résultat unique mis à jour en temps réel.

**Leçon :** la géographie doit être modifiable sans casser la recherche en cours. Multi-zone est une piste future, pas un prérequis P3 V1.

### Zillow

Référence : map/list, draw search, filtres prix/chambres/surface/type, recherche multi-zone et recherche naturelle ; possibilité de sauvegarder la recherche.

**Leçon :** la valeur du moteur vient de la combinaison `intention + zone + filtres + carte + continuité`, pas d’une accumulation de widgets.

---

## 5. Proposition de standard P3 à soumettre

### Couche primaire proposée

`Search bar → quick filters → résultat count + tri + view → list/map → cards`

### Vues

- desktop ≥ 1024 : `split` par défaut ; `list` et `map` disponibles ;
- tablette : décision après BEFORE 768 ;
- mobile : **list par défaut**, bouton carte explicite et toujours accessible ; pas de split compressé.

### Filtres

Toujours visibles :

- texte/localisation ;
- transaction ;
- prix ;
- type ;
- bouton Filtres.

Dans le sheet/panneau :

- ville/quartier ;
- surface ;
- critères avancés réellement supportés par l’API.

Règle proposée : **tout filtre actif doit être visible dans un chip/compteur et reproductible via URL ou session canonique documentée.**

### Cards

Garder une hiérarchie stable :

`photo → prix → localisation → type/surface/pièces → confiance/source → actions`

Pas de nouveau redesign P3 sans BEFORE/mockup/AFTER.

### Carte / continuité

Contrat proposé :

- mêmes filtres et même zone entre list/map ;
- retour d’un détail restaure recherche + scroll/session ;
- `project_id` préservé ;
- aucun lien carte ne repart vers un état vierge.

---

## 6. Décision / ordre d’exécution

1. Capturer BEFORE `/search` en 390 / 768 / 1280 sur un jeu de données stable.
2. Vérifier le défaut du view switcher mobile dans le navigateur réel.
3. Mesurer l’état des filtres URL/chips et la cohérence du compteur.
4. Vérifier overlap/total entre lane interne et gateway sans écriture DB.
5. Produire un mockup P3 uniquement si le BEFORE confirme un besoin visuel.
6. Présenter au propriétaire la liste exacte des invariants à promouvoir L0.
7. Après accord seulement : implémentation → AFTER mêmes viewports → tests → score → manifeste/CI.

## État

P3 est **ouvert en audit uniquement**. Aucun nouveau standard P3 n’est L0 à ce stade.
