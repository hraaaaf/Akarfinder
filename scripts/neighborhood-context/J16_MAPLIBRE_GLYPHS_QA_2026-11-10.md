# Vivre Ici / Maârif — J16 glyphes MapLibre OpenFreeMap (10/11/2026)

## Goal / Success / Proof
- Goal : éliminer la requête glyphes HTTP404 propre à la couche de nombres de clusters OSM QA, sans toucher aux repères, à la licence, aux frontières ou au fournisseur CARTO déjà configuré.
- Success : glyphes Noto Sans Regular demandés au serveur OpenFreeMap Liberty (HTTP200) ; plus de requêtes Open Sans Regular HTTP404 ; 4 captures 390/430/768/1280 sans régression JS/overflow.
- Proof : réseau Playwright localhost, source officielle Liberty et style spec MapLibre ; static contracts Node, CI exact HEAD à confirmer.

## BEFORE exact HEAD 06cd08d620bb8420486deb42f1a6f7721c484a97
- Captures Vivre Ici J15 AFTER (390x844, 430x932, 768x900, 1280x900) fournissent les quatre viewports visuels BEFORE J16 sans nouvelle modification de mise en page.
- Audit réseau J15 mobile lowzoom settled : HTTP404 https://tiles.openfreemap.org/fonts/Open%20Sans%20Regular/0-255.pbf. Autres tuiles HTTP200, aucune erreur JS. Ce 404 ne prouve pas à lui seul une frontière défectueuse ni l'absence totale des caractères.
- Code : source des clusters QA MapLibreNeighborhood3D.tsx fixait text-font ["Open Sans Regular"] alors que la configuration sans clé utilise https://tiles.openfreemap.org/styles/liberty.
- Vérification live source OpenFreeMap : style glyphs = https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf ; style Liberty utilise Noto Sans Regular/Bold/Italic. Demande directe Noto Sans Regular /0-255 HTTP200, Open Sans Regular /0-255 HTTP404. Référence : https://maplibre.org/maplibre-style-spec/glyphs/

## Correctif candidat
- Change uniquement la police de la couche MapLibre QA_OSM_COUNT_ID selon le fournisseur : OpenFreeMap -> Noto Sans Regular ; CARTO avec clé -> ancien Open Sans Regular préservé, sans prétendre avoir testé CARTO réseau réel.
- Aucun changement de source/coordonnées/limite, aucun glyph externe hébergé dans Git, aucune DB ni publication de pack.

## AFTER QA locale
- Playwright navigateur réel 4/4 PASS aux 390x844 / 430x932 / 768x900 / 1280x900 ; glyphes Noto Sans Regular observés HTTP200, aucune réponse 4xx sur la famille glyphs du fournisseur dans les quatre runs, et 0 demande Open Sans Regular. Code MapLibre prêt, repères 152/176/180/180, licence ODbL visible, zéro erreur JS, zéro overflow.
- Captures/report AFTER : C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\j16-after, dossier privé, captures 390 et 1280 montrées au demandeur.
- Tests Node 25/25 PASS, incluant garde provider (1 nouveau contrat J16).
- Limites : benchmark CDN réel, fontstack CARTO avec clé, NVDA/VoiceOver et géométrie administrative centrale non certifiés. Score visuel cible >=9,5/10 toujours non démontré.

## Gates
- Correctif local WIP tant que CI J15 HEAD 06cd08d6 est active ; ne pas annuler sa conclusion par push prématuré. Ensuite stage ciblé, commit fast-forward, push PR #1197 Draft, nouvelle CI HEAD, alignement Notion/PR et revue visuelle.
- No merge, no Vercel deployment, no product DB, no private QA tiles publication.
