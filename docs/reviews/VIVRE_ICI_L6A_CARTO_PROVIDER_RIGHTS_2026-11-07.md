# Vivre Ici — L6-A : droits des fournisseurs de cartes, crédits et gate commercial

**07/11/2026 — AUDIT EN COURS / RELEASE BLOQUÉE.** Ne pas assimiler une correction de crédit affiché à une licence d'exploitation satellite, ni ouvrir l'accès production sans accord.

## GOAL / SUCCESS / PROOF

- **Goal :** vérifier les droits et attributions cartographiques utilisées par `Vivre Ici` et éviter toute prétention « prêt pour usage commercial » sans preuve contractuelle.
- **Success technique restreint :** attribution OpenMapTiles/OSM/OpenFreeMap explicitement présente dans la source MapLibre, visible dans la carte, testée aux mêmes viewports 390/430/768/1280 ; aucun faux crédit ou activation de droit de fournisseur.
- **Proof à collecter :** source `components/map/MapLibreNeighborhood3D.tsx` + CI N3/P1A.6, captures inspectées des crédits, vérification clavier/mobiles si contrôles affectés. Les droits Esri demandent **une preuve séparée signée / conditions applicables au compte et au type de produit**. Le rendu de tuiles HTTP 200 n'est pas une licence.

## Sources primaires consultées (07/11/2026)

1. [OpenFreeMap, site officiel](https://openfreemap.org/) : usage commercial explicitement autorisé pour son instance publique, attribution demandée, **sans SLA garanti**. Crédit recommandé `OpenFreeMap © OpenMapTiles Data from OpenStreetMap`. MapLibre peut automatiquement intégrer les attributions du style.
2. [OpenMapTiles, documentation officielle attribution](https://openmaptiles.org/docs/terminology/attribution/) : le schéma et les données doivent être crédités ; présentation de référence `© OpenMapTiles © OpenStreetMap contributors`.
3. [Esri, conditions du site et des services](https://www.esri.com/en-us/legal/terms/web-site-service) : l'utilisation commerciale des services peut nécessiter des frais et une licence distincte, et les couches de tiers ont leurs propres restrictions. Le partage d'une URL d'imagerie publique ne fait pas acquérir ces droits.
4. [Esri Support, crédits World Imagery, mis à jour 20/07/2026](https://support.esri.com/en-us/knowledge-base/what-is-the-correct-way-to-cite-an-arcgis-online-basema-000012040) : la mosaïque de sources d'imagerie compte Esri et de nombreux détenteurs de contenus ; le seul libellé `Tiles © Esri` n'est pas automatiquement une attribution exhaustive pour chaque tuile.

## Sources réellement présentes dans l'application

| Surface | Fichier / configuration source | Statut vérifié au niveau code | Gate |
| --- | --- | --- | --- |
| Carte nationale | `components/map/NationalTerritoryExperience.tsx`, style `https://tiles.openfreemap.org/styles/liberty`, crédit OSM personnalisé | Style OpenFreeMap + contrôle MapLibre déclaré | Visibilité/termes des crédits à vérifier sur 4 viewports |
| Quartier/Rue Maârif | `components/map/MapLibreNeighborhood3D.tsx`, vectoriel `https://tiles.openfreemap.org/planet` | Source OSM/OpenFreeMap avait omis le crédit **OpenMapTiles** explicite ; correctif candidat le rajoute | Captures AFTER + tests visuels encore nécessaires |
| Quartier/Rue Maârif, imagerie | même fichier : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | Service raster Esri présent, source attribution `Tiles © Esri` | **BLOQUÉ : pas de preuve contractuelle de licence commerciale ni de crédits fournisseur applicables à ce produit** |

**Conservatisme nécessaire :** ni usage commercial garanti des tuiles Esri, ni obligation légale locale exhaustive ne sont tranchés ici. Une vérification Esri pour l'usage Akarfinder.ma et les fournisseurs inclus est un **human gate**. En absence d'autorisation : ne pas déployer le mode satellite basé sur cette URL ; envisager une source contractuellement licenciée ou une carte vectorielle seule, après choix produit approuvé.

## Implémentation candidate, sans déploiement

- Source vectorielle MapLibre : correction textuelle `© OpenMapTiles · © OpenStreetMap contributors · OpenFreeMap`, sans changement de géométrie, couches, centres, source provider ou capture des données. Le mode satellite Esri **reste un blocage de certification**, non déclaré résolu.
- Aucun élément UI/UX supplémentaire (badge factice, attribution inventée) ne doit être introduit pour transformer l'absence de contrat en « validation ».

## Next exact

Confirmer CI du SHA candidat ; obtenir les captures 390/430/768/1280 de l'UI carte avec crédits visibles, comparer à la référence BEFORE ; corriger contraste/taille/position si nécessaire. Puis demander la preuve de licence Esri ou arbitrer explicitement le retrait/remplacement du satellite avant release. Après cela seulement poursuivre audit clavier/lecteur d'écran et score visuel global >=9,5/10, et tests des données SQL. **PR Draft, zéro merge, zéro Vercel, zéro DB.**
