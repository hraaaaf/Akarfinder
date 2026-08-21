# AkarFinder — Session courante

**Mise à jour : 2026-08-19**

`docs/ROADMAP.md` est la roadmap globale canonique. `docs/AKARFINDER_MAP_LISTING_STANDARD_TARGET.md` est le référentiel produit du chantier courant.

## Chantier courant — Map + Listing Standard

Lot : **N0 Audit + doctrine — CURRENT**.

Goal : faire converger Map, Search, Listing et publisher onboarding en une expérience continue sans perdre la doctrine territoriale, la vérité marché, la provenance ni les permissions existantes.

Doctrine :

- Carte : `Territoire → Marché → Vie locale → Biens` ;
- Listing : `Bien → Confiance → Marché → Vie locale → Décision` ;
- publication : `owner / agence / promoteur → données structurées → AkarFinder Listing Standard`.

## Base vérifiée

- repo : `hraaaaf/Akarfinder` ;
- base `main` de N0 : `49b80c4c1deffb1f1999f91412b5092151ac63c5` ;
- PR #820 : Lot 11 mergé ;
- PR #821 : closeout documentaire uniquement, mergé ;
- aucun déploiement Vercel effectué par ces lots.

## Baseline N0

- Final UI run `32267867957` SUCCESS ; artifact `9371334718` ; 48 captures / 0 finding machine ;
- Carte C7 run `32244517896` SUCCESS ; artifact `9366976831` ; report `ok: true` ;
- Listing L17 run `32129531035` SUCCESS ; artifact `9321690793` ; 6/6 captures / 0 finding.

## Findings

- Map et Search restent deux surfaces séparées ;
- Map possède une vraie intelligence territoriale mais pas encore la boucle inventaire/pins/résultats ;
- Search possède déjà les composants utiles mais repose encore sur un bridge vers `/map` ;
- Listing est riche mais trop long, surtout mobile ;
- owner listing fonctionne : le défaut Registry précédemment suspecté n’est pas un bug runtime ; N1 harmonisera le contrat ;
- `/onboarding` est buyer/tenant legacy ; publisher onboarding doit réutiliser `lib/property-schema/onboarding.ts` ;
- metadata Map `Données indicatives 2024–2025` reste à revalider.

Audit : `docs/AKARFINDER_MAP_LISTING_STANDARD_N0_AUDIT.md`.
Wireframe : `docs/AKARFINDER_MAP_LISTING_STANDARD_WIREFRAME.md`.

## Roadmap

N0 Audit/target → N1 Listing Standard → N2 Session unifiée → N3 Workspace → N4 Viewport/pins/clusters → N5 Market zoom → N6 Vie locale/POI → N7 Listing↔Map/multisource → N8 Onboarding normatif → N9 Certification globale.

Progression stricte : **0/10 CLOSED = 0 %**. N0 reste CURRENT jusqu’au merge et au post-merge prouvés.

## Reprise exacte

Branche : `agent/map-listing-standard-n0`.
PR : `#822` draft.
HEAD N0 préparé : à revalider après le commit final de la PR.

Next : vérifier CI une fois, effectuer le travail indépendant, merger seulement si les gates N0 sont satisfaits, vérifier `main`, clôturer N0 puis démarrer N1. Aucun runtime avant fermeture N0. Aucun déploiement Vercel sans autorisation explicite.
