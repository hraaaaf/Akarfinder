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
- C5 Browser : ajout du viewport 768x900.
- Cockpit masqué sous 1024 px lorsqu’une zone est ouverte afin d’éviter le chevauchement tablette observé sur la première preuve Lot 6.
- Attente du loading durcie après changement vers Densité ; aucune tolérance silencieuse.
- UI All Pages : le 503 fail-closed attendu de `/map` dans la lane sans secrets est classé explicitement sans masquer d’autres erreurs ; la lane C5 data-rich continue d’exiger HTTP 200.

## Preuve Lot 6 certifiée avant closeout
Sur le head `154b7dec73ef33bda98f3ec548b4a88c2637a87c` :
- C5 Browser run `32122594646` : succès.
- Artifact C5 `9319164609`, digest `sha256:f766e8862ed7b94e9ef484a50f4e206261670821a77ae0a087154228e91e87d9`.
- `report.json` : `ok: true`, 16 cas, 4 quartiers x 4 viewports, aucun `pageError` ni `requestFailure`.
- Accessibility run `32122594556` : succès.
- UI All Pages Certification run `32122594655` : succès.
- UI All Pages Baseline run `32122594524` : succès.
- Canonical Baseline Compile `32122594608` : succès.
- Canonical Baseline `32122594443` : succès.
- UX Gate `32122594661` : succès.
- Geo Productization `32122594611` : succès.
- P0 `32122594699`, P1 Final Sweep `32122594833`, P2 `32122594464` : succès.
- Mockup Target `32122594452` et L2 Search Map `32122594559` : succès.
- UI Polish P3 `32122594620` et P5 `32122594704` : succès.

## Inspection visuelle
Captures C5 inspectées sur Agdal aux viewports 1280x900, 768x900, 430x932 et 390x844 :
- desktop : cockpit et sheet séparés, carte dominante, hiérarchie conforme à la référence V2 ;
- tablette : cockpit absent avec sheet ouverte, plus aucun chevauchement ;
- mobile : sheet prioritaire, CTA lisible, bottom-nav dégagée, aucun débordement.

Score visuel Lot 6 : **9,8/10**.

## Gate de fermeture
Le Lot 6 est éligible au merge uniquement si le head de closeout repasse les gates requis après cette mise à jour documentaire. Le merge, et non cette note seule, ferme le lot.

Aucun déploiement Vercel sans autorisation explicite.
