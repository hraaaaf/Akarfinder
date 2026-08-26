# AkarFinder — NCI L5 Convergence — Visual Target

Date : 2026-08-26
Statut : TARGET LOCKED — BEFORE implementation

## Goal
Faire converger homepage, pages quartier et `Vivre ici` annonce vers `NeighborhoodContextReadModelV1`, sans vérité POI parallèle.

## Audit BEFORE vérifié dans le code
- `lib/map/neighborhood-data.ts` contient encore `proximityHighlights` et `lifestyleTags` statiques.
- `components/landing/SignatureMapSection.tsx` les publie sur la homepage.
- `lib/seo-neighborhood-pages/neighborhood-seo-data.ts` les ré-exporte vers `/immobilier/[city]/[district]`.
- `/quartiers/[citySlug]/[neighborhoodSlug]` publie aussi ces champs statiques.
- `buildLivingHereForListing()` peut appeler Overpass au runtime et crée une identité POI parallèle au read-model NCI.

## Surfaces du lot
1. Homepage `/` — section `Vivre ici`.
2. SEO quartier `/immobilier/rabat/agdal`.
3. Quartier canonique `/quartiers/rabat/agdal`.
4. Fiche annonce QA `/visual-qa/announcement-page-living-here`.

## Cible commune
Chaque surface doit exposer la même vérité de quartier :
- `canonical_neighborhood_id` stable ;
- `coverage_status` visible : couvert / partiel / insuffisant / indisponible ;
- `anchor_count` réel ;
- mêmes `poi_id`, nom, catégorie, relation et `territorial_wording` ;
- provenance et fraîcheur disponibles ;
- aucun `proximityHighlight` statique publié comme POI ;
- aucun stale/rejected ;
- max 5 repères dans les cartes compactes, max 8 dans une vue détaillée.

## Règle listing
- Contexte quartier : NCI uniquement.
- Si le bien a des coordonnées exactes et un routage effectivement mesuré, une sous-section distincte peut afficher temps/distance depuis le bien.
- Un centroid quartier ne produit jamais de minutes ni un nouvel annuaire live.

## Composition visuelle cible
### Homepage
Carte compacte : `Ville · Quartier`, badge couverture, `N repères`, 2–3 catégories disponibles, CTA. Les anciens slogans/lifestyle tags ne servent plus de preuve de proximité.

### Pages quartier
Bloc `Vivre ici · repères vérifiés` après les KPI marché : badge couverture, liste courte d'anchors avec catégorie + wording territorial, source/fraîcheur discrète, état insuffisant explicite.

### Listing
`Vivre ici` conserve la hiérarchie premium existante. Le contexte quartier utilise les anchors NCI. Les temps de trajet, lorsqu'ils existent, sont clairement séparés comme mesures depuis le bien exact.

## Critères visuels
- responsive 390 / 430 / 768 / 1280 ;
- aucune barre horizontale de page ;
- carte/hero/annonce restent dominants ;
- états faibles non maquillés ;
- pas de vocabulaire subjectif (`premium`, `calme`, `familial`, etc.) utilisé comme vérité NCI ;
- cibles interactives >= 44 px ;
- score cible AFTER >= 9,3/10.

## Human gate
L5 ne peut être CLOSED avant comparaison BEFORE / target / AFTER et validation explicite de la capture par l'utilisateur.
