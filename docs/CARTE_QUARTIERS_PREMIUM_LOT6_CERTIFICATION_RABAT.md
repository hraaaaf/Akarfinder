# Carte des quartiers premium — Lot 6 Certification Rabat

## Goal
Certifier la refonte Rabat sur les mêmes familles de viewports, avec preuves visuelles data-rich, responsive, accessibilité, contrats Geo/Search/Map et build.

## Succès
- C5 Browser exact-head vert avec captures 1280x900, 768x900, 430x932 et 390x844.
- Agdal, Hay Riad, Hassan et Souissi couverts.
- Sheet dans le viewport ; bottom-nav non recouverte sur mobile.
- Search handoff city + district intact.
- Mode Densité vérifié après état stable, sans tolérance silencieuse du loading.
- Accessibility, build et contrats canoniques verts.
- Inspection visuelle finale >= 9,8/10.

## Baselines avant refonte
- Lot 3 baseline desktop : run `32059627476`, artifact `9297827321`, digest `sha256:dd53fb6a5a4377f1d8478d5bb381229af2dfec9028f25d8713afc372e4053a68`.
- Lot 4 baseline mobile : C5 run `32080855873`, artifact `9305097625`, digest `sha256:77225fac76249a42b1f07b100d11ed3d037bc804032c85d8d0f4b89246ed765d`.

## Preuves après déjà acquises
- Lot 3 desktop final : score visuel 9,8/10, merge `075b35109823764aaaf84cd93c2dfb4bfe84ae32`.
- Lot 4 mobile final : C5 run `32084140585`, artifact `9306151469`, digest `sha256:8388930b3e1b859ddfccc90ecb9d96f5b0ff47dde31e23e8e82cea86c47dc090`, score visuel 9,8/10, merge `6238a4b0035bd608b511d59569afc0f5fb30e92c`.
- Lot 5 interactions : Browser run `32084635158` vert, artifact `9306319080`, Accessibility run `32084634974` vert, merge `b205f76f91457ab28114ea8da0927d1ae76ddcca`.

## Renforcement Lot 6
Le C5 Browser ajoute le viewport 768x900 et rend strict l’attente de disparition du loading après changement vers Densité. Aucun `.catch()` ne doit transformer un état transitoire persistant en succès.

## Gate de fermeture
Lot 6 n’est fermé qu’après : artifact exact-head téléchargé, inspection 1280/768/430/390, score explicite >= 9,8/10, CI requise verte et merge.

Aucun déploiement Vercel sans autorisation explicite.
