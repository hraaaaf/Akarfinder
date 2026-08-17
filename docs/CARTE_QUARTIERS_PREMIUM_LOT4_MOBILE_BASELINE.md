# Carte des quartiers premium — Lot 4 Mobile Rabat

## Goal
Faire converger la carte quartiers Rabat mobile vers la référence premium validée, sans réécrire MapLibre/Geo/Search et sans fabriquer de données.

## Baseline canonique avant implémentation
La baseline est le HEAD exact du Lot 3 désormais mergé sur `main` via `075b35109823764aaaf84cd93c2dfb4bfe84ae32`.

Preuves :
- C5 Browser run `32080855873` ✅
- Artifact `9305097625`
- Digest `sha256:77225fac76249a42b1f07b100d11ed3d037bc804032c85d8d0f4b89246ed765d`
- Captures data-rich 390x844 et 430x932 disponibles pour Agdal, Hay Riad, Hassan et Souissi.
- UI Baseline run `32080855857` ✅
- Artifact `9305183175`
- Digest `sha256:37adf45f36dbf3676b671f9c96abd5644f8fbe9a7ef0a8a4bf56bb256e587e8d`

## Écarts visuels observés
1. Le cockpit mobile consomme trop de hauteur avant ouverture d’une zone.
2. Lorsqu’une sheet quartier est ouverte, elle devient correctement dominante mais le cockpit reste visible derrière et crée du bruit.
3. La carte utile est comprimée entre cockpit, sheet et bottom navigation.
4. La sheet reste dans le viewport et ne recouvre pas la bottom navigation : ce contrat doit être conservé.
5. Les données, CTA, contexte quartier et état fail-closed sont déjà fonctionnels et doivent être réutilisés.

## Cible Lot 4
- Carte dominante quand aucune zone n’est ouverte.
- Cockpit mobile compact, clair et tactile.
- Sheet sélectionnée premium, lisible, sans recouvrir la bottom navigation.
- Réduction du bruit visuel lorsque la sheet est ouverte.
- Cohérence stricte desktop/mobile.
- Score visuel final >= 9,8/10.

## Succès
- Captures finales 390x844 + 430x932 inspectées.
- C5 Browser, Responsive Hardening et Accessibility verts sur exact-head.
- Aucun faux quartier, polygone, prix ou annonce.

## Règle de fermeture
Aucun closeout Lot 4 sans capture finale + score visuel. Aucun déploiement Vercel sans autorisation explicite.