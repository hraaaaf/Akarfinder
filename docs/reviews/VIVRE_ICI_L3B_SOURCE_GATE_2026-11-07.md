# Vivre Ici — L3-B / source truth gate Maârif (07/11/2026)

**Statut : DRAFT — contrôle de sûreté candidat, pas publication de contour ni acquisition POI.**

## Goal / Success / Proof
- **Goal :** empêcher le rendu d'une relation administrative OSM non revue comme limite du quartier Maârif ; refuser les anciens POI au-delà des 30 jours contractuels.
- **Success :** relation OSM 2801474 explicitement `admin_level=10`, `publicationStatus=shadow`, `reviewed=false` ; routeur public ne transmet pas de polygone ; affichage « limites administratives indisponibles ». Semence POI ANN-L5 observée le 16 août 2026 ; au 7 novembre aucun point actif / `coverage_status=unavailable`.
- **Proof :** tests intégrés à `scripts/scrapers/__tests__/p1a6-responsive-hardening.test.ts` (cas Maârif relation admin + POI expirés). P1A.6/Required Gate/TypeScript sur HEAD exact de la PR + CI, aucune donnée réelle ni production DB modifiée.

## Provenance des distinctions

- Registre interne : `lib/geo/casablanca-neighborhood-geometry-shadow.ts` expose `candidate(2801474, "maarif", "Maârif")`, OSM relation d'**arrondissement**, admin level **10**, source ODbL, `reviewed=false`, mode `shadow`. Collection matérialisée en `data/geo/casablanca-arrondissements-osm.json` non promue en public.
- Données POI : `lib/neighborhood-context/certified-seed.ts` (`ANN_L5_CERTIFIED_SEED_OBSERVED_AT=2026-08-16T11:08:32.249Z`), `lib/neighborhood-context/poi-registry.ts` (`NEIGHBORHOOD_POI_MAX_AGE_MS=30 jours`) et `read-model.ts` (filtre `active && fresh`).
- Sources externes à consulter lors de la revue finale (sans les substituer à une revue géométrique) : [Wiki OpenStreetMap — Casablanca](https://wiki.openstreetmap.org/wiki/FR:Casablanca), [OSM relation 2801474](https://www.openstreetmap.org/relation/2801474), [Mairie Casablanca — Arrondissement Maârif](https://maarif.casablancacity.ma/fr/article/483/contact), [OSM licence ODbL](https://www.openstreetmap.org/copyright).
- Sémantique : un arrondissement administratif peut couvrir un secteur distinct du quartier courant ; **ne pas l'étiqueter « contour du quartier Maârif »**.

## Décision d'implémentation
Préserver l'UI `limites administratives indisponibles` et `aucun repère suffisamment récent` jusqu'à réception de données administratives qualifiées et de POI réellement réobservés. Ne pas promouvoir une géométrie Shadow en changeant un booléen, réétiqueter une relation, prolonger un TTL, insérer un pin ou attribuer une fausse source.

## Gates restant avant L3 complet
1. Revue explicite de l'emprise et de la sémantique administrative ; typage séparé **arrondissement** vs **quartier** ; conformité ODbL/attribution.
2. Acquisition de POI récents avec date, source OSM et autorisations ; sélection et non-surcharge mobile.
3. Screenshots comparables 4 viewports pour chaque mode effectivement publiable ; sinon état indisponible.
4. Requalification fournisseur satellite Esri et attribution cartographique avant release. Aucune fusion, DB ni Vercel dans ce lot.

## Closeout
**NEXT exact :** tests exact HEAD ; si verts, conserver le blocage source avec preuve et passer à L4 multiville / L5 Search, sans prétendre L3 complet.


## Closeout / preuves — 07/11/2026

**HEAD applicatif testé :** [`d5d800fc84f66a2e944f21dded5406c4db0716c0`](https://github.com/hraaaaf/Akarfinder/commit/d5d800fc84f66a2e944f21dded5406c4db0716c0).

- [P1A.6 #42384180778](https://github.com/hraaaaf/Akarfinder/actions/runs/42384180778) : **SUCCESS**. Logs : 27/27 tests, dont les deux cas L3-B **PASS** ; audit navigateur 31 captures / `findings=[]`. Artefact #13578743514.
- [Required PR Gate #42384180777](https://github.com/hraaaaf/Akarfinder/actions/runs/42384180777), [Canonical Baseline #42384180807](https://github.com/hraaaaf/Akarfinder/actions/runs/42384180807), [CI Efficiency #42384180850](https://github.com/hraaaaf/Akarfinder/actions/runs/42384180850), [P1B.2 OFFLINE #42384180823](https://github.com/hraaaaf/Akarfinder/actions/runs/42384180823), [N3 #42384180800](https://github.com/hraaaaf/Akarfinder/actions/runs/42384180800) et [Zillow #42384180720](https://github.com/hraaaaf/Akarfinder/actions/runs/42384180720) : **SUCCESS**.
- Vérifié : le statut `shadow/reviewed=false` du contour et le rejet de POI âgés de plus de 30 jours sont maintenant couverts par tests.

**Lot L3-B source-guard : VALIDÉ TECHNIQUEMENT**, mais L3 fonctionnel complet **NON** (aucun contour administratif publié ni POI neuf acquis). Aucun build public, fusion, activation DB ou Vercel.

**Next exact :** restauration de la base PR #1182 vers L3-A ; L4-A source multiville sur branche séparée ; L5 Search E2E et revue fournisseurs/licences avant L6.
