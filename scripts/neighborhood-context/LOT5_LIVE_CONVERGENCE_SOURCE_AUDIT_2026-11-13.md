# Lot 5 — Audit des sources vivantes et de la convergence
Date : 2026-11-13. Référence : PR #1197, SHA d3d56b9cad5653afc54e1b8bb4c2a81c60864f32 (28 CI SUCCESS, 2 SKIPPED).
Statut : AUDIT SOURCE-CODE UNIQUEMENT — aucune publication ni acceptation produit.

## 1. GOAL / SUCCESS / PROOF
Goal : inventorier les sources des surfaces du Lot 5 et expliquer l'état zéro-ancre de Vivre Ici avant de chercher à atteindre le score UX cible 9,5/10.
Success de l'audit : origines du contexte et écarts prouvés par les fichiers du HEAD, risques séparés des faits, prochains tests décrits ; aucun POI inventé.
Proof : fichiers et contrats cités ci-dessous, HEAD vérifié ; les anciennes preuves GitHub Actions sur le code applicatif restent valables à leur SHA, non transférées à ce document.

## 2. Fraîcheur vérifiée — cause principale de la fiche vide
- lib/neighborhood-context/certified-seed.ts : ANN_L5_CERTIFIED_SEED_OBSERVED_AT = 2026-08-16T11:08:32.249Z ; 12 POI historiques sur 4/6 pilotes, dont 2 candidats liés à Casablanca Maârif.
- lib/neighborhood-context/poi-registry.ts : NEIGHBORHOOD_POI_MAX_AGE_MS = 30 jours. Date d'expiration théorique du seed : 2026-09-15T11:08:32.249Z.
- lib/neighborhood-context/read-model.ts : les POI conservés doivent avoir status active ET freshness_status fresh. Un ancien seed ne devient pas frais par simple régénération des pages.
- Le canonique constate explicitement au 09/11/2026 : 6 read-models sur 6 à 0 ancre actuelle, couverture unavailable. Cela est cohérent avec le code en novembre ; ce n'est pas une nouvelle mesure directe en production.
- Interdit : antidater/retoucher observed_at pour masquer l'expiration ; injecter les 415 candidats Geofabrik privés ou les 24 dossiers Maârif non admis sans le processus d'admission et l'autorisation correspondants.

## 3. Inventaire des surfaces V1 et des sources
| Surface | Chemin constaté | Source du contexte | Verdict au code |
|---|---|---|---|
| Carte Vivre Ici | app/map/page.tsx -> P4MapDecisionRail.tsx | /api/geo/neighborhood-context -> NeighborhoodContextReadModelV1 | Source commune RACCORDEE ; zéro POI affiché honnêtement |
| Page quartier SEO | app/immobilier/[city]/[district]/page.tsx -> NeighborhoodContextPanel | getNeighborhoodContextReadModelBySlugs | Source commune RACCORDEE |
| Alias historique quartier | app/quartiers/[citySlug]/[neighborhoodSlug]/page.tsx | Redirection vers /immobilier/... | Pas de seconde source publique démontrée |
| Annonce moderne | app/listings/[id]/page.tsx -> AnnouncementPageShell -> PropertyDetailV2 -> LivingHereSection | buildConvergedLivingHereForListing -> resolve-read-model | Source commune RACCORDEE ; route GPS exact séparée |
| Homepage / | app/page.tsx | Ne monte PAS HomeVivreIciSection ni SignatureMapSection | Surface Vivre Ici manquante malgré composant existant |
| Composant homepage non monté | HomeVivreIciSection -> SignatureMapSection | buildNeighborhoodContextRuntimeCatalog | Source commune raccordée dans composant, MAIS composant non affiché sur / |
| Proximité historique listing | components/listings/ListingDetail.tsx, lib/proximity/morocco-proximity.ts, lib/listings/enrichment.ts | listes heuristiques/statique avec minutes indicatives | RISQUE de vérité parallèle SI le code est consommé ; pas démontré sur /listings/[id] moderne |

## 4. Contradiction historique du protocole L5 AFTER
- scripts/scrapers/__tests__/neighborhood-context-l5-convergence.test.ts valide une fixture Agdal au 26 août 2026 avec 4 ancres/partial et refuse un seed stale ; ne pas interpréter la fixture comme des données fraîches de novembre.
- scripts/audits/neighborhood-context-l5-after-audit.mjs exige encore coverage=covered ainsi qu'un module Vivre Ici homepage. Le test historique n'est pas une certification live aujourd'hui avec 0 POI / homepage non montée.
- docs/NEIGHBORHOOD_CONTEXT_L5_VISUAL_TARGET.md reste une référence de design historique, non une capture de la homepage réelle en novembre.

## 5. Wireframe de cible — NON IMPLÉMENTÉ
Sur les quatre surfaces, afficher le même canonical_neighborhood_id et la même couverture. Quand les POI sont périmés : un seul état indisponible lisible, un lien vers Search, un disclosure Sources et limites. Ne jamais afficher des minutes depuis un centroïde ni un faux contour.
Homepage : section compacte Maârif/Agdal/Guéliz utilisant la projection NCI actuelle sans présenter 0 ancre comme un quartier vide. C'est une proposition de placement à valider par BEFORE et mockup réel.
Annonce avec GPS exact vérifié : conserver les mesures liées au BIEN dans une sous-section distincte des repères QUARTIER.

## 6. Chemin critique selon la roadmap
1. Audit des chemins : réalisé ici, sans conclusion de disponibilité live.
2. BEFORE de la homepage réelle, page quartier, Vivre Ici et annonce sur 390x844, 430x932, 768x900 et 1280x900, en version candidate.
3. Mockup/target séparant le manque de données et la valeur réelle, avant toute insertion UI.
4. Implémentation de la convergence Homepage uniquement après captures ; empêcher les chemins historiques de publier une vérité POI parallèle si leur usage est prouvé.
5. Rafraîchissement source via acquisition HORS rendu, source_id, source_url, observed_at, licence, identifiant, statut, relation quartier, attribution et sélection des anchors vérifiés. Garder les seuils live L1/L2 et les gates L6 ; aucune injection des dossiers privés de J18.
6. AFTER mêmes viewports, CI Chromium, a11y natif si UI impactée, comparaison et score visuel honnête. Objectif UX utilisateur >= 9,5/10 toujours NON certifié.
7. Human gate de validation de capture, GO de merge distinct et GO Vercel distinct. J18 OSM public reste désactivé.

## Verdict
Audit SOURCE effectué ; Lot 5 toujours ACTIVE, Lot 6 OPEN. Aucun POI public admissible supplémentaire prouvé par cette analyse. Ne pas prétendre avoir atteint 9,5/10. Pas de merge/deploy/data change. Avancement de roadmap historique 4 lots CLOSED / 6 = 66,7 %, sans signification de couverture POI vivante.
