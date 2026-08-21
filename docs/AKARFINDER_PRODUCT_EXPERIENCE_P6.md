# AkarFinder Product Experience — P6 Quartier / Ville

Date : 2026-08-21
Base : `main@e56855609ffdf1de94bffac0191e817f383b9ff2`
Statut : **CERTIFIED — MERGED**

## Goal

Faire converger les surfaces Ville et Quartier vers la hiérarchie canonique :

`Territoire → Marché → Vie locale → Biens → Décision`

avec une lecture plus courte, une mini-carte territoriale réelle et la palette bleu / navy / blanc, sans fabriquer de métrique ville, de position ou de disponibilité.

## Résultat certifié

- Ville et Quartier commencent par un bloc Territoire compact ;
- trois repères truth-safe sont visibles immédiatement ;
- Ville ne calcule aucune moyenne prix : elle compte uniquement les quartiers disposant réellement d'un repère marché ;
- Quartier réutilise uniquement les données existantes `priceLabel`, `pricePeriod`, `confidence`, `lifestyleTags` et `proximityHighlights` ;
- mini-carte basée sur les coordonnées canoniques existantes, sans polygone inventé ;
- ordre rendu : Territoire → Biens → Décision, avec Marché et Vie locale remontés dans les repères ;
- style bronze absent de la surface P6 ;
- `GeoResultPreview` conserve son rendu historique hors activation explicite `accent="brand"` ;
- aucun changement DB, source, ranking ou navigation métier ;
- aucun déploiement Vercel.

## BEFORE exact

Branche : `agent/product-experience-p6-quartier-ville-before`
PR : `#838` — **CLOSED / PROOF ONLY / NEVER MERGE**
HEAD : `7a630672f522584ae5a2233bca7a22cd2f170347`
Run : `32489490492` — **SUCCESS**
Artifact : `9449200557`
Digest : `sha256:3642119d082c896435676021c00a83c6866bc356dba21be39a8f2ad36279bf95`
Routes : `/immobilier/rabat` et `/immobilier/rabat/agdal`
Viewports : 390×844 / 430×932 / 768×900 / 1280×900
Résultat : **8/8 captures, 0 finding, 0 overflow**.

## Référence visuelle

P1-B1 certifiée : artifact `9420359227`.
Composition reprise : territoire → repères → carte → biens → décision. Les chiffres du mockup n'ont pas été copiés sans donnée réelle correspondante.

## Certification finale

PR : `#839`
Head certifié : `85c1a6d9ae3a581a557d6acb48764d9a308dfde8`
Run final : `32496690996` — **SUCCESS**
Artifact AFTER : `9451942620`
Digest : `sha256:48c04c6b2293a52b174e4202b31d03ef43e9dd88cf756c8629cf4fd498533f0e`
Résultat : **8/8 AFTER, 0 finding, 0 overflow**.

Gates :
- contrats P6 ✅ ;
- audit syntax `node --check` ✅ ;
- TypeScript ✅ ;
- build production ✅ ;
- Chromium ✅ ;
- serveur production ✅ ;
- mini-cartes chargées ✅ ;
- certification responsive ✅ ;
- upload artifact ✅.

Score visuel : **9,2/10**.
Human gate : **PASS**.

## Merge

PR `#839` squash-mergée dans `main`.
Merge commit : `e7f7ac753b1fbb41303cd19f0cb0377bff070512`.
Post-merge : `main` vérifié sur ce commit avant closeout documentaire.

## Hors scope

Le concept interactif national « villes / régions comme boutons de carte » reste PARKED. PR #835 fermée sans merge.
