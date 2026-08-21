# AkarFinder — Product Experience P8 Publication

Statut : **CERTIFIED — MERGED**

## Goal

Transformer `/vendre/dossier` en fabrique d’une annonce signature AkarFinder alignée sur la référence visuelle V4 validée :

`Bien → Confiance → Territoire → Marché → Vie locale → Décision → Source`

Le formulaire collecte des faits réels, produit un score explicable et conserve une publication fail-closed.

## Success validé

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

## AFTER certifié

- Head certifié : `10460c45028575dbd939cbaea53374512c840036`
- Run dédié : `32518229299` — SUCCESS
- Artifact : `9459637165`
- Digest : `sha256:b7601871caca2b3b10816a2cda8da44a4ad41c75dd364baa5eecc5350488bb25`
- 4/4 captures AFTER : 390×844 / 430×932 / 768×900 / 1280×900
- `findingCount = 0`
- P8 contracts : SUCCESS
- audit syntax : SUCCESS
- TypeScript : SUCCESS
- production build : SUCCESS
- responsive visual certification : SUCCESS
- Seller Entry Quality Standard : SUCCESS
- Seller Secure Publish Flow : SUCCESS
- Seller Structured Draft Gate : SUCCESS
- Lead API Hardening : SUCCESS
- Controlled Publication Management : SUCCESS
- Moderation Correction Flow : SUCCESS

## Validation visuelle

- comparaison BEFORE → V4 → AFTER inspectée sur les 4 viewports ;
- score visuel : **9,1/10** ;
- réserve mineure : le bottom-nav mobile occupe une partie de la zone verticale sur 390 px ; le flow conserve `pb-20`, reste scrollable et aucun overflow n’est détecté ;
- human visual gate : **APPROVED — 2026-08-21**.

## Merge

- PR : `#843`
- merge method : squash
- merge commit : `bb14bedc5fa4cde8013dd31a83479c09dd610502`
- `main` vérifié sur ce commit après merge.

## Invariants

- score = qualité/complétude de la fiche, jamais valeur du bien ;
- aucun champ inventé ;
- données non applicables exclues du score ;
- enrichissements marché AkarFinder hors score vendeur ;
- publication fail-closed : hard gates + review humaine + confirmation explicite ;
- aucune migration DB dans P8 ;
- aucun déploiement Vercel.
