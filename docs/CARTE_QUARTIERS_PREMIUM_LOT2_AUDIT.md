# Carte des quartiers premium — Lot 2 audit delta runtime

Statut : **AUDIT TERMINÉ — IMPLEMENTATION NON DÉMARRÉE**  
Date : 2026-08-17  
Base : `main` après merge Lot 1 `12eaa8b69d00f14131e4497576b0f4ee3ac2b3af`  
Spec canonique : `docs/CARTE_QUARTIERS_PREMIUM_REFONTE.md`

## Goal

Comparer le runtime `/map` actuel à la cible premium validée et identifier le **delta minimal** à implémenter sans reconstruire MapLibre, Geo Registry, Search ou les contrats URL existants.

## Succès

Le Lot 2 est réussi si :

- la baseline réelle desktop/mobile est identifiée ;
- les composants réutilisables sont distingués des éléments à refondre ;
- la voie Rabat actuelle est comprise ;
- les contraintes de vérité géographique sont préservées ;
- le Lot 3 peut commencer sans ambiguïté architecturale.

## Preuves auditées

### Baseline visuelle réelle

Workflow : `UI All Pages Baseline`  
Run : `32043246162`  
Artifact : `9292438915`  
Digest : `sha256:4cb082c369e95b201bda37dc89ca22428aebbb52ca83830b61d46b74ee95cc93`

Captures inspectées :

- `map-1280x900.png`
- `map-768x900.png`
- `map-390x844.png`
- `map-430x932.png`

### Runtime/code inspecté

- `app/map/page.tsx`
- `app/map/mockup-convergence-l2.css`
- `components/map/MapNeighborhoodClient.tsx`
- `components/map/MapNeighborhoodExperience.tsx`
- `components/map/RabatMarketIntelligenceExperience.tsx`
- `lib/map/canonical-neighborhood-data.ts`
- `app/api/geo/rabat-market-intelligence/route.ts`

## 1. Ce qui existe déjà et doit être conservé

### Shell produit

`/map` utilise déjà :

- `SiteHeader` ;
- `SiteFooter` desktop ;
- responsive mobile ;
- design system bleu AkarFinder ;
- CSS de convergence spécifique Map.

### Moteur carte

Déjà en place :

- MapLibre ;
- basemap claire et sombre ;
- lifecycle carte ;
- zoom / bounds / thème ;
- attribution OSM ;
- logique markers / clusters ;
- couches territoriales AkarFinder ;
- états de sélection ;
- logique fail-closed.

**Décision : aucune réécriture du moteur MapLibre.**

### Vérité géographique / Search

Déjà en place :

- Geo Entity Registry ;
- `canonical-neighborhood-data.ts` ;
- URL Map canonique ;
- `city + district` ;
- handoff Map -> Search ;
- quartier non cartographiable conservé comme filtre sans frontière inventée.

**Décision : contrats à préserver byte-for-byte fonctionnellement.**

## 2. Architecture actuelle importante : Rabat a déjà une voie dédiée

`MapNeighborhoodClient` ne rend pas toujours le même composant.

- si `navigationState.city !== "rabat"` : `MapNeighborhoodExperience` + `TerritorialExplorer` + `MapLegend` ;
- si `navigationState.city === "rabat"` : `RabatMarketIntelligenceExperience`.

Donc le mockup Rabat premium doit être construit **sur la voie Rabat existante**, pas en créant une troisième expérience parallèle.

## 3. État visuel baseline — desktop

La baseline 1280 montre actuellement :

- header global AkarFinder correct et déjà cohérent avec le produit ;
- grand panneau de contrôle en haut de carte ;
- sélecteur ville sous forme de `<select>` ;
- bande `Maroc / villes` assez haute ;
- clusters villes sur vue nationale ;
- légende très volumineuse en bas à gauche ;
- footer desktop très massif visible dans le même viewport ;
- carte utile réduite verticalement par la densité périphérique.

### Delta vers cible premium

À modifier :

1. **carte plus dominante** ;
2. sélecteur six villes compact, horizontal, premium ;
3. contrôles primaires plus légers ;
4. légende compacte / contextuelle ;
5. suppression du bruit périphérique inutile ;
6. footer hors de la zone décisionnelle immédiate si nécessaire sans casser la structure globale ;
7. hiérarchie claire `ville -> quartier -> décision`.

## 4. État visuel baseline — mobile

La baseline 390 montre :

- header mobile déjà cohérent ;
- bottom navigation déjà présente ;
- carte MapLibre fonctionnelle ;
- sélecteur `Tout le Maroc` et contrôles empilés ;
- carrousel/bande villes horizontal partiellement coupé ;
- légende occupant une part excessive de l’écran ;
- faible surface cartographique réellement exploitable.

### Delta vers cible premium

À modifier :

1. conserver header + bottom nav ;
2. rendre recherche / ville / filtres beaucoup plus compacts ;
3. rendre la carte prioritaire ;
4. déplacer l’information secondaire dans une bottom sheet compacte ;
5. éviter toute légende permanente volumineuse ;
6. maintenir zones tactiles et focus accessibles.

## 5. Rabat Market Intelligence — fondation déjà très proche du besoin

Le composant dédié Rabat possède déjà :

- source GeoJSON dédiée ;
- couches fill / line / labels ;
- clic sur zone ;
- hover ;
- sélection par `district` ;
- modes Prix / Densité / Annonces ;
- transaction vente/location ;
- panel `RabatMarketZoneSheet` ;
- fallback données indisponibles ;
- navigation Search.

### Conclusion

Le Lot 3 ne doit pas créer un nouveau `NeighborhoodTerritoryLayer` si les couches Rabat actuelles peuvent être refactorées visuellement. Le composant existant est la base principale.

## 6. Limite géographique réelle de Rabat

Le runtime actuel mappe les zones marché suivantes vers des districts :

- `market_zone_rabat_agdal` -> `agdal`
- `market_zone_rabat_hay_riad` -> `hay-riad`
- `market_zone_rabat_souissi` -> `souissi`
- `market_zone_rabat_centre` -> `hassan`

Le mockup visuel affiche davantage de secteurs, notamment Océan et Yacoub El Mansour.

**Ils ne doivent pas recevoir de polygone inventé pour coller au mockup.**

L’API Rabat expose explicitement :

- semantic type : `market_zone` ;
- `official-boundary=false` ;
- scope : `observed-only` ;
- attribution OSM + zones marché dérivées AkarFinder ;
- statut canary market zones.

### Décision UI

Le design doit fonctionner avec :

- 4 zones polygonales actuelles quand disponibles ;
- quartiers supplémentaires représentés uniquement par les formes autorisées par le Geo Registry / données canoniques ;
- aucune illusion de frontière administrative officielle.

## 7. Delta minimal de composants

### Conserver / refactorer

- `MapNeighborhoodClient`
- `RabatMarketIntelligenceExperience`
- `MapNeighborhoodExperience`
- `RabatMarketZoneSheet`
- Geo Registry
- `map-navigation-state`
- `canonical-neighborhood-data`
- MapLibre lifecycle
- API intelligence marché
- tokens Design System

### À ajouter ou extraire seulement si l’existant devient illisible

1. `PremiumCitySelector`
   - six villes phares ;
   - Rabat actif ;
   - fallback vers villes disponibles ;
   - ne change aucun contrat URL.

2. `PremiumMapFilterBar`
   - Budget ;
   - Type ;
   - Surface ;
   - Chambres ;
   - Filtres ;
   - peut être réduit au sous-ensemble réellement fonctionnel au premier lot plutôt que simuler des filtres non câblés.

3. `RabatNeighborhoodDecisionCard`
   - peut être un refactor de `RabatMarketZoneSheet` ;
   - quartier actif ;
   - métrique ;
   - contexte de confiance / source ;
   - CTA Search.

4. `MapInsightStrip`
   - secondaire ;
   - compact ;
   - uniquement données réelles.

## 8. Éléments du mockup qui ne doivent pas être implémentés aveuglément

- nombres d’annonces fictifs ;
- prix fictifs ;
- tendances fictives ;
- polygones de quartiers non autoritatifs ;
- fiche immobilière fictive si aucun listing réel ne peut être relié au contexte ;
- compteurs inventés pour remplir l’interface.

Le mockup est une **cible de composition et de hiérarchie**, pas une source de données.

## 9. Plan Lot 3 — delta desktop Rabat

Ordre recommandé :

1. conserver le shell `/map` ;
2. refactorer la barre de contrôle Rabat en composition premium ;
3. ajouter le sélecteur compact des six villes ;
4. agrandir la surface de carte utile ;
5. alléger légendes / panneaux permanents ;
6. restyler zones actuelles avec palette pastel sophistiquée et sélection bleu AkarFinder ;
7. refactorer `RabatMarketZoneSheet` vers une fiche décisionnelle plus légère ;
8. afficher uniquement métriques réelles ;
9. conserver mode fail-closed ;
10. capturer les mêmes viewports après implémentation.

## 10. Plan Lot 4 — delta mobile Rabat

1. garder `SiteHeader` mobile ;
2. conserver bottom nav ;
3. city selector compact / scrollable ;
4. recherche + filtres sur deux niveaux maximum ;
5. carte plein espace restant ;
6. bottom sheet non bloquante ;
7. pas de légende permanente occupant le viewport ;
8. états loading / error / no geometry compacts.

## 11. Critères de non-régression

Après Lot 3/4 :

- `city + district` inchangé ;
- Search handoff inchangé ;
- URL canonicalization inchangée ;
- aucune frontière inventée ;
- aucune métrique inventée ;
- dark/light theme fonctionnel ;
- clavier / focus conservés ;
- mobile 390 / 430 ;
- tablet 768 ;
- desktop 1280 ;
- build + TypeScript + gates Geo/Search/Map verts.

## Conclusion

**La base technique est largement suffisante.**

La refonte premium est principalement un chantier de **composition UI, densité, hiérarchie et polish** autour de `RabatMarketIntelligenceExperience`, avec quelques extractions de composants seulement si elles simplifient réellement le code.

Le moteur Map, les contrats Geo, les contrats Search et l’URL state ne doivent pas être reconstruits.

## Next exact

**Lot 3 : prendre une baseline Rabat dédiée sur les viewports cibles, puis implémenter le delta desktop minimal dans la voie `RabatMarketIntelligenceExperience`, sans toucher aux géométries ni aux métriques.**
