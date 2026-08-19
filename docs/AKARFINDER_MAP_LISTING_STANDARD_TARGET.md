# AkarFinder — Map + Listing Standard

Date de gel : 2026-08-19
Statut : **CURRENT — N0 Audit + doctrine**

Ce document verrouille le référentiel produit du nouveau chantier. Les anciens closeouts Carte, Search et Listing restent des preuves historiques valides ; ils ne sont pas rouverts automatiquement. Le nouveau programme traite leur **convergence en une expérience unique**.

## Goal global

Faire d’AkarFinder une expérience immobilière continue où la carte explique d’abord le territoire et le marché, puis révèle les biens, tandis que la fiche transforme ces mêmes données en aide à la décision et que la publication produit des annonces structurées selon le même contrat.

## Succès global

Le programme est réussi lorsque :

1. Map, Search et Listing partagent un état de recherche/navigation canonique ;
2. desktop propose un vrai workspace carte + résultats sans rupture de page conceptuelle ;
3. mobile reste map-first avec résultats/territoire en bottom sheet ;
4. le zoom sémantique progresse `ville → quartier → marché → biens` ;
5. sélection résultat ↔ pin est bidirectionnelle ;
6. déplacement de carte permet `Rechercher dans cette zone` sans perdre les filtres ;
7. Prix / Densité / Annonces / Confiance restent truth-safe et séparés Vente/Location ;
8. Vie locale / POI reste sourcée et fail-closed ;
9. Listing réutilise territoire, marché, confiance et vie locale sans second calcul concurrent ;
10. owner / agence / promoteur publient via un même standard de bien, avec provenance, droits média et permissions explicites ;
11. 390 / 430 / 768 / 1280 passent sans overflow/collision et avec comparaison BEFORE / target / AFTER ;
12. aucune donnée, géographie, permission, tendance, provenance ou précision n’est inventée.

## Preuve globale

- captures BEFORE exact-head ;
- référence/mockup verrouillé avant toute implémentation visuelle ;
- tests de contrats d’état et de vérité ;
- captures AFTER aux mêmes viewports ;
- comparaison visuelle + revue humaine ;
- TypeScript + production build ;
- browser smoke Map/Search/Listing ;
- aucun closeout sans artefact exact-head.

## Doctrine produit

### Carte

`Territoire → Marché → Vie locale → Biens`

AkarFinder ne doit pas être un tapis de pins. La carte explique le contexte avant de révéler l’inventaire.

### Listing

`Bien → Confiance → Marché → Vie locale → Décision`

La fiche ne répète pas des blocs de données : elle organise les preuves nécessaires à une décision.

### Publication / onboarding

`Propriétaire / Agence / Promoteur → données structurées → AkarFinder Listing Standard`

Le buyer/tenant journey (`Compagnon → Mon Projet`) reste distinct du publisher onboarding. `/onboarding` est aujourd’hui une route legacy de redirection vers le Compagnon et ne doit pas être confondue avec la publication d’un bien.

## Principe Zillow-like

**Prendre les mécaniques, pas l’identité.**

À reprendre :

- split map / résultats desktop ;
- filtres persistants et compacts ;
- pins/prix/clusters selon le niveau de zoom ;
- synchronisation hover/clic résultat ↔ carte ;
- `Rechercher dans cette zone` après déplacement ;
- continuité de session entre exploration et détail.

À préserver AkarFinder :

- territoire et quartier comme première couche de compréhension ;
- bleu/navy AkarFinder et surfaces premium sobres ;
- confiance, provenance, fraîcheur et précision visibles ;
- métriques observées et états insuffisants explicites ;
- séparation stricte Vente / Location ;
- aucune imitation visuelle générique d’un portail américain.

À refuser :

- tapis de pins sans hiérarchie ;
- énorme panneau masquant la carte ;
- retour vers une page Search déconnectée après chaque sélection ;
- valeurs marché mélangées ou extrapolées ;
- duplication des moteurs de calcul entre Map et Listing.

## Cible desktop

1. Header AkarFinder compact.
2. Barre de recherche + filtres persistants.
3. Workspace principal : carte dominante ~60 % / résultats ~40 % comme ordre de grandeur, jamais comme constante CSS obligatoire.
4. Sans sélection : panneau résultats + intelligence territoriale contextuelle.
5. Sélection d’un quartier : état territorial + marché + stock visible.
6. Sélection d’un bien : pin sélectionné + quick preview synchronisé.
7. Ouverture fiche : contexte de recherche conservé pour retour exact.

## Cible mobile

1. Header compact.
2. Filtres horizontaux accessibles.
3. Carte occupant la majorité du viewport.
4. Bottom sheet à trois niveaux : collapsed / preview / expanded.
5. Collapsed : nombre de biens + zone.
6. Preview : une carte bien ou intelligence quartier selon la sélection.
7. Expanded : liste complète / détails sans perdre la carte/session.
8. Bottom-nav globale préservée avec clearance mesurée.

## Zoom sémantique

- **National / inter-ville** : villes, volume disponible, aucun faux prix agrégé.
- **Ville** : quartiers/market zones admissibles, métrique active.
- **Quartier** : Prix / Densité / Annonces / Confiance + stock.
- **Rue / proximité** : pins/clusters des biens lorsque la précision source le permet.
- une annonce de précision quartier ne devient jamais artificiellement une adresse ou un point exact.

## Invariants de vérité

- Vente et Location séparées partout ;
- `NULL` / indisponible conservé, jamais transformé en zéro ;
- aucune tendance sans historique suffisant ;
- aucune catégorie dominante sans échantillon suffisant ;
- `geo_precision` gouverne le niveau de rendu ;
- provenance et rights média gouvernent galerie/thumbnail ;
- source tierce non autorisée ne devient jamais une fiche interne structurée ;
- owner/partner/first-party restent distinguables par provenance même si l’UI converge ;
- market intelligence et stock propre/partenaire ne sont pas confondus.

## Fondations à réutiliser

Ne pas réécrire les fondations existantes :

- `lib/map/map-navigation-state.ts` ;
- `lib/map/listing-map.ts` ;
- `lib/map/city-market-*` ;
- `lib/map/market-metric-reliability.ts` ;
- `lib/map/listing-inventory-provenance.ts` ;
- `lib/geo/living-here*` et `lib/geo/street-reality*` ;
- moteurs POI/routing existants ;
- `lib/property-schema/core.ts` ;
- `lib/property-schema/onboarding.ts` ;
- contrats completeness / provenance / média existants ;
- `lib/property-detail/*` ;
- owner publication/detail/projection existants ;
- standards partner existants ;
- canonical Search session et `SearchMapNavigationBridge` comme fondation à simplifier, pas comme cible finale.

## Compatibilité historique

`docs/CARTE_INTELLIGENCE_MARCHE_*` reste la référence de vérité pour les métriques, géométries certifiées et règles fail-closed déjà validées.

Le présent programme **supersède uniquement la direction UX produit** lorsque celle-ci maintient Map, Search et Listing comme surfaces trop indépendantes.

## Roadmap stricte N0 → N9

Progression du chantier = lots CLOSED / 10.

### N0 — Audit + doctrine + baseline + target
État : **CURRENT**.

Livrables : baseline exact-head Map/Search/Listing/Publication, gap matrix, présent target, risques et fondations réutilisables.

Gate : aucune implémentation UI avant baseline + target + référence visuelle verrouillés.

### N1 — AkarFinder Listing Standard
État : TODO.

Unifier le contrat d’identité/provenance/permissions pour owner, agence, promoteur et first-party, sans casser les guards existants.

### N2 — Session/navigation unifiée Map ↔ Search ↔ Listing
État : TODO.

Un seul état canonique : transaction, ville, quartier, viewport/zone, filtres, tri, sélection, projet éventuel et retour.

### N3 — Workspace Zillow-like AkarFinder
État : TODO.

Desktop split map/list + mobile map/bottom-sheet, conformément au mockup verrouillé.

### N4 — Viewport search + pins + clusters + précision geo
État : TODO.

Afficher l’inventaire correspondant à la zone visible avec représentation adaptée à `geo_precision`.

### N5 — Semantic zoom marché
État : TODO.

Prix / Densité / Annonces / Confiance intégrés au même workspace avec transition selon le zoom et truth contract unique.

### N6 — Semantic zoom Vie locale / POI
État : TODO.

POI, accessibilité/proximité et Street Reality utiles à la décision, sans surcharge ni invention.

### N7 — Listing ↔ Carte + propriété canonique / multisource
État : TODO.

Retour exact à la recherche, localisation truth-safe, marché et territoire réutilisés, consolidation multisource sans mélanger les droits.

### N8 — Onboarding normatif owner / agence / promoteur
État : TODO.

Réutiliser le schéma dynamique existant ; adapter les obligations et permissions par rôle/source au lieu de créer trois formulaires divergents.

### N9 — Certification globale
État : TODO.

Régression, performance, accessibilité, vérité data, navigation, captures BEFORE/target/AFTER et revue humaine finale.

## Hors scope initial

- draw-area avancé ;
- calcul de temps de trajet avancé ;
- nouvelles métriques de marché non déjà prouvées ;
- extension géographique non certifiée ;
- activation ou mutation DB implicite ;
- déploiement Vercel sans autorisation produit explicite.

## Gate UI/UX obligatoire

Pour N3 à N9 et toute modification visuelle antérieure :

1. captures BEFORE aux mêmes viewports ;
2. Goal visuel écrit ;
3. mockup/wireframe/référence verrouillée ;
4. implémentation ;
5. captures AFTER ;
6. comparaison BEFORE / target / AFTER ;
7. score visuel humain documenté.

Matrice canonique minimale : `390×844 / 430×932 / 768×900 / 1280×900`.

## Déploiement

**Aucun déploiement Vercel n’est autorisé par ce document.** Toute mise en production exige une autorisation explicite séparée.
