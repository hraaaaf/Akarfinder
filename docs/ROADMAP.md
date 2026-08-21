# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-19**
**Statut : Map + Listing Standard N0 CURRENT ; anciens programmes certifiés conservés comme historique.**

`README.md` porte l’identité générale. `docs/SESSION.md` porte le handover court. Ce fichier est la roadmap globale active.

## Gouvernance de l’historique

Le précédent ledger détaillé de `docs/ROADMAP.md` n’est pas détruit : il reste récupérable intégralement dans Git au commit `49b80c4c1deffb1f1999f91412b5092151ac63c5`, blob `f097e0396a1a38e339aeb8868900779ac9a87182`.

Pointeur : `docs/archive/ROADMAP_SNAPSHOT_PRE_MAP_LISTING_STANDARD_2026-08-19.md`.

La roadmap active ne recopiera plus des centaines de lignes de closeouts historiques. Un lot fermé conserve sa preuve dans son document de closeout et dans Git.

---

# 1. CHANTIER ACTIF — MAP + LISTING STANDARD

Référentiel : `docs/AKARFINDER_MAP_LISTING_STANDARD_TARGET.md`.
Audit N0 : `docs/AKARFINDER_MAP_LISTING_STANDARD_N0_AUDIT.md`.
Wireframe N0 : `docs/AKARFINDER_MAP_LISTING_STANDARD_WIREFRAME.md`.

## Goal

Faire converger Map, Search, Listing et publisher onboarding en une expérience continue sans perdre l’intelligence territoriale, la vérité marché, la provenance ni les permissions AkarFinder.

Doctrine :

- Carte : `Territoire → Marché → Vie locale → Biens` ;
- Listing : `Bien → Confiance → Marché → Vie locale → Décision` ;
- publication : `owner / agence / promoteur → données structurées → AkarFinder Listing Standard`.

## Progression stricte

Lots CLOSED / 10 : **0 / 10 = 0 %**.

N0 est CURRENT et ne compte pas CLOSED avant certification, merge et post-merge prouvés.

## N0 — Audit + doctrine + baseline + target

État : **CURRENT — PR de préparation**.

Goal : verrouiller la baseline réelle, le target et le wireframe avant toute modification runtime/UI.

Succès :

- HEAD courant vérifié ;
- BEFORE exact-head Map/Search/Listing/Publication récupérés ;
- gap matrix vérifiée ;
- target produit écrit ;
- wireframe desktop/mobile écrit ;
- ancienne Carte conservée comme preuve historique, pas comme contrainte UX finale ;
- 0 code runtime modifié.

Preuves déjà réunies :

- Final UI run `32267867957`, artifact `9371334718`, 48 captures / 0 finding machine ;
- Carte C7 run `32244517896`, artifact `9366976831`, report `ok: true` ;
- Listing L17 run `32129531035`, artifact `9321690793`, 6/6 captures / 0 finding ;
- PR #821 vérifiée : 2 fichiers docs seulement, 0 runtime.

Gate de fermeture : CI docs/contrats si déclenchée, revue de cohérence, merge, main post-merge, N0 marqué CLOSED.

## N1 — AkarFinder Listing Standard

État : TODO.

Goal : unifier identité, provenance, permissions et représentation publique owner / agence / promoteur / first-party.

Contraintes : conserver le chemin owner existant ; aucune source tierce non autorisée promue ; droits média explicites ; réutiliser les guards existants.

## N2 — Session/navigation unifiée Map ↔ Search ↔ Listing

État : TODO.

Goal : un état canonique unique pour transaction, ville, quartier, zone/viewport, filtres, tri, sélection, projet et retour.

## N3 — Workspace Zillow-like AkarFinder

État : TODO.

Goal : desktop split map/results + mobile map/bottom-sheet selon le wireframe, sans copier l’identité Zillow.

Gate UI : BEFORE + target + AFTER aux mêmes viewports, score humain obligatoire.

## N4 — Viewport search + pins + clusters + précision geo

État : TODO.

Goal : inventaire visible selon la zone réellement explorée, représentation compatible avec `geo_precision`, sélection résultat ↔ pin.

## N5 — Semantic market zoom

État : TODO.

Goal : intégrer Prix / Densité / Annonces / Confiance au même workspace selon le niveau de zoom, Vente/Location séparées, fail-closed.

## N6 — Vie locale / POI

État : TODO.

Goal : rendre POI, accessibilité/proximité, Living Here et Street Reality utiles sans masquer la décision principale ni inventer de données.

## N7 — Listing ↔ Map + propriété canonique / multisource

État : TODO.

Goal : conserver le contexte exact de recherche, réutiliser la même intelligence marché/territoire et consolider le multisource sans mélanger droits/provenances.

## N8 — Onboarding normatif owner / agence / promoteur

État : TODO.

Goal : réutiliser `lib/property-schema/onboarding.ts` comme noyau commun ; différencier obligations et permissions par rôle/source, pas le modèle de bien.

Buyer/tenant onboarding (`Compagnon → Mon Projet`) reste un flow distinct.

## N9 — Certification globale

État : TODO.

Goal : certifier UX/UI/navigation/performance/accessibilité/vérité data avec preuves exact-head, BEFORE / target / AFTER et revue humaine.

---

# 2. PROGRAMMES HISTORIQUES FERMÉS RÉUTILISÉS

Ces programmes ne sont pas rouverts par N0. Leurs invariants restent applicables tant qu’ils ne sont pas explicitement superseded.

## Carte intelligence marché — CLOSED

- Lot 11 : PR #820 mergée ;
- post-merge : PR #821 mergée ;
- progression historique documentée : **11/11 = 100 %** ;
- product head certifié `3db92d158ca2c388e5d53857089fce304348899b` ;
- aucune donnée/géométrie/tendance inventée ;
- `docs/CARTE_INTELLIGENCE_MARCHE_LOT11.md` et `docs/CARTE_INTELLIGENCE_MARCHE_POSTMERGE_CLOSEOUT.md` restent les preuves.

## Listing Visual Target Convergence — CLOSED

- L17 : PR #814 mergée `0f24bd260a97753f3aa9f16f9dfbd4f528c40521` ;
- exact head `367fe07f74653e61025e80ed0cfaf31d87e211d7` ;
- artifact L13/L17 `9321690793`, 6/6 captures, 0 finding ;
- profondeur métier conservée comme fondation, composition susceptible d’être recomposée par N7.

## Audit Toutes Pages v1 — CLOSED

- 5/5 jalons historiques CLOSED ;
- 64 patterns App Router gouvernés ;
- preuves détaillées conservées dans `docs/UI_ALL_PAGES_V1_CERTIFICATION.md` et l’ancien snapshot roadmap.

## DATA MASS — CLOSED

- MASS-1 → MASS-6 CLOSED ;
- MASS-X5 CLOSED ;
- toute activation/mutation production reste un programme séparé avec gate explicite.

---

# 3. LANES PARALLÈLES NON REVALIDÉES PAR N0

N0 ne modifie pas silencieusement le statut des lanes Search/Data/Visual historiques qui ne sont pas sur son chemin critique.

Leur dernier état détaillé avant ce chantier est conservé dans le snapshot Git référencé plus haut. Toute reprise d’une de ces lanes doit commencer par une revalidation live de son HEAD, PR, CI, DB et/ou déploiement avant de déclarer son état courant.

En particulier :

- Search Ranking v2 : ne pas supposer un déploiement applicatif actuel sans preuve Vercel ;
- Bibliothèque visuelle quartiers : ne pas supposer un rollout national terminé sans preuve ;
- writes DB / ingestion / activation : aucun statut historique n’autorise une nouvelle mutation implicite.

---

# 4. INVARIANTS GLOBAUX

- zéro donnée, permission, géographie, provenance ou précision inventée ;
- aucune écriture DB sans gate explicite approprié ;
- aucune source tierce non autorisée promue en listing structuré first-party ;
- Vente / Location séparées pour les métriques marché ;
- fail-closed si preuve insuffisante ;
- exact-head + preuve visuelle avant certification d’un lot visuel ;
- BEFORE / target / AFTER aux viewports `390 / 430 / 768 / 1280` pour le chantier courant ;
- machine green ≠ score UX ; revue humaine requise ;
- une CI en cours ne stoppe pas le travail indépendant ;
- aucun déploiement Vercel sans autorisation explicite.

# 5. REPRISE EXACTE

Chantier : **Map + Listing Standard**.

Lot : **N0 CURRENT**.

Next : certifier la cohérence de la PR N0, merger si les gates sont satisfaits, vérifier `main`, marquer N0 CLOSED puis ouvrir N1 sur le contrat Listing Standard. Aucun runtime Map/Search/Listing avant fermeture N0.
