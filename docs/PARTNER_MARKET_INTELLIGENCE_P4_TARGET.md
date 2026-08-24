# AkarFinder — Partner Market Intelligence V2 — P4 Target

Date : 2026-08-24  
Statut : **TARGET APPROVED BY P1 CONTRACT — BEFORE CERTIFICATION**

## Goal

Transformer les offres partenaires canoniques déjà résolues par P3 en snapshots quartier nationaux calculables, comparables dans le temps et sûrs :

`CanonicalPropertyV1 + GeoResolutionV2 → Prix/m² + Volume + Densité admissible + catégories + fraîcheur + benchmark`

## Succès

1. volume dédupliqué par propriété canonique × transaction ;
2. vente/location toujours séparées ;
3. seuls les inventaires actifs `available/upcoming` sont comptés ;
4. prix/m² calculé uniquement avec prix exact valide + surface canonique positive ;
5. médiane, jamais moyenne naïve ;
6. échantillon et reliability existante conservés ;
7. fraîcheur paramétrée explicitement par snapshot ;
8. catégories de biens comptées sans imputation ;
9. densité uniquement si une aire positive du **même Neighborhood ID** est fournie comme certifiée ;
10. absence/ambiguïté/non-certification de l'aire → densité `NULL` ;
11. Yakeey uniquement comme benchmark prix vente, jamais comme aire ni volume ;
12. représentativité marché reste `uncertified` ;
13. provenance, source count, snapshot version/date conservés ;
14. snapshots comparables dans le temps avec deltas `NULL`-safe.

## Fondations réutilisées

- `lib/map/market-metric-reliability.ts` : médiane/reliability ;
- `lib/market/market-benchmark-registry.ts` : Yakeey ;
- `docs/CARTE_INTELLIGENCE_METRICS_CONTRACT.md` : contrat Prix / Annonces / Densité ;
- `docs/CARTE_C2_CLOSEOUT.md` : doctrine métriques observées ;
- `lib/geo/neighborhood-geometry-registry.ts` + `lib/geo/geometry-area.ts` : future source d'aires certifiées, sans activation implicite ;
- P2/P3 : canonique partenaire + Neighborhood ID.

## Non-goals

- aucune migration/write DB ;
- aucune prétention d'exhaustivité marché ;
- aucune activation de géométrie quartier ;
- aucune valeur numérique hardcodée dans UI ;
- aucun changement UI ;
- aucun déploiement Vercel.

## Preuve attendue

Un seul workflow P4 :

- régression P2 + P3 ;
- tests agrégateur P4 ;
- TypeScript ;
- build production.

P4 ne devient CLOSED qu'après run exact-head vert et relecture des logs.
