# ANNOUNCEMENT-PAGE-ULTRA-PREMIUM — ANN-L3 Closeout

**Lot : ANN-L3 — Property Core**  
**Statut : ✅ CLOSED**  
**Date : 2026-08-16**

## Résultat

ANN-L3 remplace la hiérarchie card-heavy de l'identité du bien par un Property Core continu et truth-safe, sans modifier le backend, le ranking, les permissions média ni la base de données.

Ordre public livré :

`Transaction → Prix → Titre → Localisation → Surface / Chambres / SDB / Garage`.

Le média reste désormais strictement média : le prix, le titre, la localisation et la transaction ne sont plus incrustés dans les photos. La description est progressive et les groupes de caractéristiques utilisent des sections continues tout en conservant la provenance détaillée.

## Preuve runtime

- **PR #733 ✅ MERGED**
- merge : `b9c1a86a74593694d7a92f85cb342509ca2dd679`
- exact head certifié : `a87bec0120fa850ac4cd7c946294bb233f7cf3b8`
- gate dédié : `Announcement Page L3 Property Core`
- run : `31939718402` — **SUCCESS**
- artefact : `9261693956`
- digest : `sha256:2beb2d35df3321b83759698e42b1fecc071e0dffb6f6f3d8ce0c36165f037917`
- schéma rapport : `ANNOUNCEMENT_PAGE_L3_PROPERTY_CORE_VISUAL_V1`
- **10/10 captures, 0 finding**

Scénarios certifiés :

- normal : 390×844, 430×932, 768×900, 1280×900 ;
- prix non communiqué : 390×844, 1280×900 ;
- titre long : 390×844, 1280×900 ;
- facts sparse : 390×844 ;
- facts dense : 1280×900.

Invariants navigateur sur les 10 scénarios : HTTP 200, **H1=1**, **main=1**, **overflow horizontal=0**, aucune réponse HTTP en erreur et aucune erreur console.

## Contrats truth-safe

- prix absent → `Prix non communiqué`, jamais `0 DH` ;
- facts essentiels absents/0 → masqués, jamais présentés comme valeurs réelles ;
- titre absent → état explicite ;
- localisation absente → état explicite ;
- longue chaîne de titre non tronquée ;
- provenance détaillée conservée ;
- description progressive `Voir plus / Voir moins` accessible ;
- Property Core = unique source du H1 public.

## Régressions et anomalies traitées

1. Premier candidat L3 : TypeScript refusait le narrowing de `listing.price`; correction typée sans changement fonctionnel.
2. Les gates historiques `UX P1 Decision Continuity` / L1 cherchaient encore le H1 directement dans `PropertyDetailV2`; le contrat a été migré vers la composition réelle `PropertyDetailV2 + PropertyCore`. Aucun runtime n'a été modifié par ce correctif.
3. `Phase 1 P0 Closure Gate` a échoué une première fois uniquement sur le téléchargement externe de `Plus Jakarta Sans` depuis Google Fonts. Les contrats et TypeScript étaient verts ; le rerun du même head est **SUCCESS**.

## Non-régression exact-head

Sur `a87bec0120fa850ac4cd7c946294bb233f7cf3b8`, les gates suivants sont notamment **SUCCESS** :

- `Announcement Page L1 Premium Shell` — run `31939718405` ;
- `Announcement Page L2 Media Gallery` — run `31939718443` ;
- `Announcement Page L3 Property Core` — run `31939718402` ;
- `UX P1 Decision Continuity` — run `31939718433` ;
- `UX P1 Mobile Decision Ergonomics` — run `31939718413` ;
- `Phase 1 Final Design Accessibility Gate` — run `31939718416` ;
- `Canonical Baseline Compile Validation` — run `31939718397` ;
- `Canonical Baseline Validation` — run `31939718420` ;
- `Phase 1 P1 Search Truth Gate` — run `31939718400` ;
- `Phase 1 P1 Final Sweep Gate` — run `31939718395` ;
- `Phase 1 P2 Residual Closure Gate` — run `31939718428` ;
- `Phase 1 P0 Closure Gate` — run `31939718418` après rerun réseau.

## Inspection humaine

Inspection des captures représentatives 390 et 1280 : **PASS pour le scope ANN-L3**.

Le média respire, l'identité du bien est lisible juste après le hero, la ligne de facts est compacte, les titres longs restent utilisables sur mobile et la densité globale est nettement réduite. Les blocs AkarScore / marché / fit restent volontairement plus card-heavy : ils appartiennent à **ANN-L4 — Akar Intelligence** et ne sont pas maquillés comme dette résolue dans L3.

## Comptabilité

- ANN-L0 : 4 % CLOSED
- ANN-L1 : 7 % CLOSED
- ANN-L2 : 7 % CLOSED
- ANN-L3 : 6 % CLOSED

**Progression cumulée après closeout : 24 / 100 %.**

**Prochain chemin critique : ANN-L4 — Akar Intelligence.**
