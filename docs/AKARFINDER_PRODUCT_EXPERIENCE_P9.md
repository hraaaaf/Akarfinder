# AkarFinder — Product Experience P9 Professionnels

Statut : **CERTIFIED — MERGED**

## Goal

Réconcilier `/pro` avec la cible canonique P1-B1 :

`AkarFinder Pro → proposition de valeur → aperçu dashboard → 3 piliers → parcours métier → standards data/trust → activation`

Le hub doit ressembler à un produit professionnel premium sans présenter de KPI, partenaire, badge ou résultat comme réel tant que les données correspondantes n’existent pas.

## Success validé

- hero canonique : `Vos annonces, votre identité, notre intelligence territoriale.` ;
- aperçu dashboard visible mais explicitement non chiffré tant qu’aucun compte actif ne fournit de métriques ;
- trois piliers : Identité pro / Publication structurée / Intelligence marché ;
- parcours Agences et Promoteurs conservés ;
- activation `#contact` conservée ;
- contrat data-for-value conservé : déclaré / calculé / déduit / non renseigné ;
- règles trust et sponsoring conservées ;
- aucune modification DB, permissions, ranking, source ou API d’activation ;
- responsive 390 / 430 / 768 / 1280 sans overflow ;
- aucun Vercel.

## BEFORE exact-main

- Base produit : `main@037a69da46ca48ed0eb4e8598ad9765dc4ff6a5b`
- Branche preuve : `agent/product-experience-p9-professionnels-before`
- PR preuve : `#844` — CLOSED, merged=false
- HEAD preuve : `25121bae72e655c50dc5eff56df0d9d5105778c7`
- Run : `32520736637`
- Artifact : `9460500727`
- Digest : `sha256:c73eb4e7971c226f46753fc92b88de092815a6b2eb2072b11348080f48476362`
- 4/4 captures : 390×844 / 430×932 / 768×900 / 1280×900
- HTTP 200 sur les 4 viewports
- 1 H1, 1 main, logo canonique, aucun overflow horizontal

Le run BEFORE était rouge uniquement parce que son audit exigeait à tort un header exact-white. Le baseline observé était `rgba(7, 27, 51, 0.97)` sur les quatre viewports. Ce point est conservé comme état BEFORE.

## Référence visuelle

Cible P1-B1 : artifact canonique `9420359227`, target `professionnels`.

Principes retenus :
- surface navy profonde ;
- header intégré à la hero ;
- hero en deux colonnes desktop ;
- dashboard partenaire comme preuve visuelle ;
- trois piliers compacts immédiatement après la hero ;
- bleu / navy / blanc ;
- pas de KPI fictif présenté comme réel.

La maquette canonique utilise `42 annonces / 18 leads / 91% complétude`. Ces chiffres ne sont pas repris dans `/pro` produit : l’aperçu reste non chiffré tant qu’aucune donnée réelle ne l’alimente.

## AFTER certifié

- Head certifié : `d3346506f3e4e86ab2f177e01bfbae117419d424`
- Run dédié : `32522040260` — SUCCESS
- Artifact : `9460942556`
- Digest : `sha256:09029c06c04a8ca26be61533ee2bf039de2feef41a34e9074743a4cba602cdb9`
- 4/4 captures AFTER : 390×844 / 430×932 / 768×900 / 1280×900
- `findingCount = 0`
- P9 contracts : SUCCESS
- Phase 1 P1 B2B Productization Gate : SUCCESS
- Lead API Hardening Gate : SUCCESS
- Phase 1 Final Design Accessibility Gate : SUCCESS
- UI All Pages Certification : SUCCESS
- Canonical Baseline Compile Validation : SUCCESS

Les échecs `UX Gate 0 Contracts` et `Canonical Baseline Validation` observés sur le même commit étaient hors périmètre P9 ; la certification P9 dédiée et les gates métier/pro/accessibilité pertinentes sont vertes.

## Validation visuelle

- comparaison BEFORE → cible P1-B1 → AFTER inspectée sur 390 / 430 / 768 / 1280 ;
- score visuel : **9,3/10** ;
- réserve mineure : page mobile volontairement informationnelle et longue, sans défaut de navigation ou overflow ;
- human visual gate : **APPROVED — 2026-08-21**.

## Merge

- PR : `#845`
- merge method : squash
- merge commit : `1a38b9cafab26d090f0b995c220d172202650673`
- `main` vérifié sur ce commit après merge.

## Invariants

- aucun KPI fictif présenté comme réel ;
- activation professionnelle reste fail-closed et séparée d’une organisation active ;
- aucune modification DB, migrations, permissions, ranking, sources ou API d’activation ;
- aucun déploiement Vercel.
