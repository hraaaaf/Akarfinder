# Carte intelligence marché — C5 closeout

Date : 2026-08-16
Statut : CLOSED

## Résultat

C5 livre une fiche de `market_zone` riche sur la Carte Rabat sans modifier la vérité statistique C2/C3.

La fiche :
- affiche la métrique active directement depuis la feature C3 déjà sélectionnée ;
- conserve `sampleCount`, surface et fiabilité Prix ;
- enrichit Agdal, Hay Riad et Hassan uniquement avec le contexte canonique existant ;
- omet tout contexte et lien quartier pour Souissi lorsqu'aucune fiche canonique n'existe ;
- conserve le CTA Search filtré par ville, district et transaction ;
- conserve le disclaimer permanent `market_zone` non administratif et valeurs non interpolées ;
- reste compacte et scrollable sur mobile sans chevaucher la bottom-nav.

## Preuves runtime

PR runtime : #708 `feat(map): enrich Rabat market-zone sheet`.

Head exact certifié : `43f402031155873ff48abb2c279f341c53a5819b`.

Merge runtime : `5b36197304bcb3c8c8cd94c5432ce6d3111c476c`.

Gates exact-head :
- `Carte C5 Rich Zone Sheet` run `31923996230` : SUCCESS ;
- `Carte C5 Rich Zone Sheet Browser` run `31923996206` : SUCCESS.

Artefact browser :
- id `9257273391` ;
- digest `sha256:809b78c251096551c5e9e456807069ece2988685ea05e2556fd5fb2ca2d1add7` ;
- 12 captures : Agdal / Hay Riad / Hassan / Souissi × 390 / 430 / 1280 ;
- report `ok: true` ;
- 0 page error ;
- 0 échec de requête C3.

## Collision mobile résolue par mesure

Le premier correctif empirique n'a pas suffi. Le smoke a donc été instrumenté pour mesurer la géométrie réelle :
- viewport 390 px ;
- bas de fiche : 772 px ;
- haut de bottom-nav : 768 px ;
- overlap réel : 4 px.

La fiche a été remontée de 14 px supplémentaires, de `bottom-[76px]` à `bottom-[90px]`, afin de supprimer le chevauchement avec une marge cible d'environ 10 px. Le smoke final conserve l'assertion stricte de non-collision.

## Vérifications fonctionnelles

Le browser smoke final certifie :
- les quatre zones ouvrent une fiche ;
- Search CTA pointe vers `/search` avec Rabat + district sélectionné + transaction ;
- Agdal / Hay Riad / Hassan ont leur contexte canonique et lien fiche quartier ;
- Souissi n'a ni contexte pseudo-factuel ni lien quartier inventé ;
- le passage Prix → Densité conserve la fiche et remplace la métrique avec le payload C3 correspondant ;
- mobile 390/430 et desktop 1280 restent dans le viewport et hors bottom-nav.

## Limite conservée

Le snapshot Prix peut rester `insufficient`. C5 n'améliore ni ne maquille la couverture marché : `Données insuffisantes` reste l'état correct quand C3 le décide.

## Handoff C6

C6 doit réutiliser l'ownership professionnel existant pour la fondation « nos annonces ». Seul un ownership explicitement `verified` peut devenir inventaire propre public ; `claimed` ou absent reste fail-closed. L'inventaire propre doit rester séparé de `listing_count`, `listing_density_km2` et du signal Prix C2/C3.