# Carte des quartiers premium — Lot 7 Industrialisation multi-villes

Statut : **CERTIFIÉ — EN ATTENTE DE MERGE**  
Date : 2026-08-18

## Goal
Extraire uniquement les contrats réellement communs prouvés par Rabat, afin que Casablanca, Marrakech, Tanger, Agadir et Fès puissent adopter la même expérience premium sans dupliquer les contrats Map, Search, Geo ou les règles fail-closed.

## Succès
- le routage `/map` reste canonique et compatible `city + district` ;
- un contrat unique décrit les six villes premium et leur provider éventuel ;
- aucune ville ne peut être activée en intelligence polygonale sans provider explicite, géométrie et métriques admissibles ;
- Rabat conserve exactement son comportement certifié Lot 6 ;
- aucune duplication du Search handoff, de `map-navigation-state`, du Geo Registry ou de MapLibre lifecycle ;
- tests ciblés + build + gates existantes verts.

## Preuve
Head fonctionnel certifié : `52ed47ecda839ef8cec834fcdafdf6674309523b`.

Gates exact-head validées :
- Carte Lot 7 City Registry Contract `32137687471` ✅ ;
- Carte C4 Rabat Heatmap Gate `32137687588` ✅ ;
- Carte C4 Rabat Browser Smoke `32137687647` ✅ ;
- Carte C7 Final Certification `32137687541` ✅ ;
- Canonical Baseline Compile Validation `32137687489` ✅ ;
- Canonical Baseline Validation `32137687481` ✅ ;
- Phase 1 Final Design Accessibility Gate `32137687526` ✅ ;
- P1A.6 Responsive Hardening `32137687443` ✅ ;
- P1B.1 AkarFinder Map Visual Layer `32137687501` ✅ ;
- P1B.2 Territorial Intelligence `32137687442` ✅ ;
- Phase 1 P0/P1/P2 ✅ ;
- UI Polish P3/P5 ✅ ;
- UI All Pages Baseline + Certification ✅ ;
- UX Gate 0 Contracts ✅.

## Audit de l’existant après Lot 6

### Commun déjà prouvé
1. Navigation structurée : `MapNavigationState`, `buildMapHref`, `buildMapSearchHref`, `withMapLocation`.
2. Résolution géographique : Geo Entity Registry.
3. Shell `/map` et routage client : `MapNeighborhoodClient`.
4. MapLibre + thème clair/sombre.
5. Villes phares produit : Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès.
6. Modes intelligence : prix, densité, annonces.
7. Transactions : vente, location.
8. États : loading, erreur, fail-closed, sélection, Search handoff.
9. Règle géométrique : ne jamais fabriquer une limite ou une métrique.

### Spécifique Rabat à ne pas généraliser aveuglément
1. endpoint `/api/geo/rabat-market-intelligence` ;
2. IDs `market_zone_rabat_*` ;
3. mapping zone -> district ;
4. géométries `market_zone` Rabat ;
5. métriques et preuves issues du pipeline Rabat ;
6. contenu contextuel de `RabatMarketZoneSheet`.

## Architecture minimale retenue

### A. Registre premium par ville
Le registre commun expose :
- slug canonique ;
- nom affiché ;
- ordre produit ;
- capacité `explore` ;
- `marketIntelligenceProvider`, typé et nullable.

Le booléen générique `marketIntelligence: true/false` est abandonné : il permettrait d'activer une ville sans préciser quel moteur doit la servir. Le provider explicite rend ce branchement impossible par accident.

État certifié Lot 7 :
- Rabat → `rabat-market-intelligence` ;
- Casablanca, Marrakech, Tanger, Agadir, Fès → `null`.

Le registre ne contient aucune géométrie, aucun prix et aucun fallback inventé.

### B. Expérience intelligence
La généralisation sépare :
- shell visuel et interactions communes ;
- adapter/provider propre à chaque ville ;
- mapping zone -> district propre à chaque ville ;
- contenu contextuel propre à la ville lorsque nécessaire.

Une ville sans provider complet reste sur l’expérience canonique existante. Elle ne doit jamais être routée vers un faux clone de Rabat.

### C. Contrat provider
Un provider ville doit être capable de fournir :
- GeoJSON admissible ;
- provenance et fraîcheur ;
- métrique par mode/transaction ;
- mapping vers `district` Search ;
- état explicite lorsque la donnée est insuffisante.

## Interdictions
- copier-coller `RabatMarketIntelligenceExperience` cinq fois ;
- renommer des IDs Rabat pour simuler une autre ville ;
- utiliser un centroïde comme polygone ;
- extrapoler un prix ville en prix quartier ;
- contourner Geo Registry ou Search contract ;
- activer visuellement une ville avant preuve provider.

## Gate de fermeture
Lot 7 est fermé seulement après merge du PR sur un head dont les gates requises sont vertes. Tant que le merge n’est pas prouvé, la progression globale reste à 75 %.

Aucun déploiement Vercel sans autorisation explicite.
