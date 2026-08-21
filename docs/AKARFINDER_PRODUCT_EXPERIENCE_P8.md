# AkarFinder — Product Experience P8 Publication

Statut : **IMPLEMENTED — AWAITING CERTIFICATION**

## Goal

Transformer `/vendre/dossier` en fabrique d’une annonce signature AkarFinder alignée sur la référence visuelle V4 validée :

`Bien → Confiance → Territoire → Marché → Vie locale → Décision → Source`

Le formulaire doit collecter des faits réels, produire un score explicable et conserver la publication fail-closed.

## Success

- assistant guidé en 6 étapes : Type → Localisation → Caractéristiques → Prix & confiance → Médias → Vérification ;
- champs dynamiques selon le type de bien ;
- aperçu AkarFinder V4 alimenté uniquement par les données réellement saisies ;
- Score dossier AkarFinder /100 avec dimensions explicables ;
- données marché / vie locale non inventées lorsque non disponibles ;
- données riches stockées dans `declared_facts` sans migration DB ;
- au moins 3 photos acceptées et score ≥60 avant revue ;
- revue humaine obligatoire ;
- confirmation explicite du vendeur avant publication ;
- responsive sans overflow aux viewports 390 / 430 / 768 / 1280 ;
- header blanc exact et identité AkarFinder canonique ;
- aucun Vercel.

## BEFORE

- Base : `main@89d66ecc71d6f65d0445efdbd087626625650990`
- Run : `32501661643` — SUCCESS
- Artifact : `9453744788`
- Digest : `sha256:e6d7f848370711ad480dfc16f2b80f90723c248a19c2d4c255daf17769c5af01`
- 4 viewports exacts.

## Référence visuelle

La V4 validée dans le chantier est la cible finale. Aucun nouveau mockup n’est requis.

Principes visuels V4 :
- galerie immobilière forte avant l’intelligence ;
- décision claire ;
- confiance lisible et humaine ;
- territoire central ;
- modules Marché / Vie locale / Source ;
- score de qualité secondaire, jamais KPI dominant ;
- bleu / navy / blanc AkarFinder.

## Preuve finale attendue

- tests ciblés P8 verts ;
- `node --check` de l’audit ;
- TypeScript vert ;
- build production vert ;
- 4/4 captures AFTER ;
- `findingCount = 0` ;
- inspection manuelle BEFORE → V4 → AFTER ;
- score visuel ;
- human gate avant merge.
